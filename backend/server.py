from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from telethon.tl.types import Channel, Chat, User, InputPeerChannel, InputPeerChat

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Global dictionary to store active forwarder clients
active_forwarders: Dict[str, TelegramClient] = {}
forwarder_tasks: Dict[str, asyncio.Task] = {}

# Models
class TelegramAuthRequest(BaseModel):
    api_id: int
    api_hash: str
    phone_number: str

class TelegramCodeRequest(BaseModel):
    user_id: str
    code: str
    password: Optional[str] = None

class TelegramSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_id: int
    api_hash: str
    phone_number: str
    session_string: Optional[str] = None
    is_authenticated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatInfo(BaseModel):
    id: int
    name: str
    type: str  # 'channel', 'group', 'user'
    username: Optional[str] = None

class ForwardingRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    source_chat_id: int
    source_chat_name: str
    destination_chat_id: int
    destination_chat_name: str
    keywords: List[str] = []
    filter_media: bool = False
    media_types: List[str] = []  # ['photo', 'video', 'document', 'audio']
    hide_source: bool = True  # If True, copy message (no "Forwarded from"), if False, forward normally
    is_active: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForwardingRuleCreate(BaseModel):
    user_id: str
    source_chat_id: int
    source_chat_name: str
    destination_chat_id: int
    destination_chat_name: str
    keywords: List[str] = []
    filter_media: bool = False
    media_types: List[str] = []
    hide_source: bool = True  # Default: hide the source

class ForwardingLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    user_id: str
    message_text: Optional[str] = None
    has_media: bool = False
    media_type: Optional[str] = None
    forwarded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str  # 'success', 'failed'
    error_message: Optional[str] = None

# Authentication endpoints
@api_router.post("/telegram/auth/start")
async def start_telegram_auth(auth_request: TelegramAuthRequest):
    try:
        # Create a new session
        session = StringSession()
        telegram_client = TelegramClient(session, auth_request.api_id, auth_request.api_hash)
        
        await telegram_client.connect()
        
        # Send code request
        await telegram_client.send_code_request(auth_request.phone_number)
        
        # Generate user_id
        user_id = str(uuid.uuid4())
        
        # Store session info in database
        session_doc = TelegramSession(
            user_id=user_id,
            api_id=auth_request.api_id,
            api_hash=auth_request.api_hash,
            phone_number=auth_request.phone_number,
            is_authenticated=False
        )
        
        doc = session_doc.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.telegram_sessions.insert_one(doc)
        
        # Store client temporarily
        active_forwarders[user_id] = telegram_client
        
        return {"user_id": user_id, "message": "Code sent to your phone"}
    except Exception as e:
        logging.error(f"Error starting auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/telegram/auth/verify")
async def verify_telegram_code(code_request: TelegramCodeRequest):
    try:
        telegram_client = active_forwarders.get(code_request.user_id)
        if not telegram_client:
            raise HTTPException(status_code=404, detail="Session not found. Please start authentication again.")
        
        # Get session data
        session_data = await db.telegram_sessions.find_one({"user_id": code_request.user_id}, {"_id": 0})
        if not session_data:
            raise HTTPException(status_code=404, detail="Session data not found")
        
        try:
            # Sign in with code
            await telegram_client.sign_in(
                session_data['phone_number'],
                code_request.code
            )
        except SessionPasswordNeededError:
            if not code_request.password:
                return {"requires_password": True, "message": "2FA enabled. Please provide password."}
            await telegram_client.sign_in(password=code_request.password)
        
        # Save session string
        session_string = telegram_client.session.save()
        
        await db.telegram_sessions.update_one(
            {"user_id": code_request.user_id},
            {"$set": {"session_string": session_string, "is_authenticated": True}}
        )
        
        return {"success": True, "message": "Authentication successful", "user_id": code_request.user_id}
    except PhoneCodeInvalidError:
        raise HTTPException(status_code=400, detail="Invalid code")
    except Exception as e:
        logging.error(f"Error verifying code: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/telegram/chats/{user_id}")
async def get_telegram_chats(user_id: str):
    try:
        # Get session
        session_data = await db.telegram_sessions.find_one({"user_id": user_id, "is_authenticated": True}, {"_id": 0})
        if not session_data:
            raise HTTPException(status_code=404, detail="User not authenticated")
        
        # Create client from saved session
        session = StringSession(session_data['session_string'])
        telegram_client = TelegramClient(session, session_data['api_id'], session_data['api_hash'])
        
        await telegram_client.connect()
        
        chats = []
        async for dialog in telegram_client.iter_dialogs():
            chat_type = 'user'
            if isinstance(dialog.entity, Channel):
                chat_type = 'channel' if dialog.entity.broadcast else 'group'
            elif isinstance(dialog.entity, Chat):
                chat_type = 'group'
            
            chats.append(ChatInfo(
                id=dialog.id,
                name=dialog.name,
                type=chat_type,
                username=getattr(dialog.entity, 'username', None)
            ).model_dump())
        
        await telegram_client.disconnect()
        
        return {"chats": chats}
    except Exception as e:
        logging.error(f"Error getting chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Forwarding rules endpoints
@api_router.post("/forwarding/rules", response_model=ForwardingRule)
async def create_forwarding_rule(rule: ForwardingRuleCreate):
    try:
        rule_obj = ForwardingRule(**rule.model_dump())
        doc = rule_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.forwarding_rules.insert_one(doc)
        return rule_obj
    except Exception as e:
        logging.error(f"Error creating rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/forwarding/rules/{user_id}")
async def get_forwarding_rules(user_id: str):
    try:
        rules = await db.forwarding_rules.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        for rule in rules:
            if isinstance(rule['created_at'], str):
                rule['created_at'] = datetime.fromisoformat(rule['created_at'])
        return {"rules": rules}
    except Exception as e:
        logging.error(f"Error getting rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/forwarding/rules/{rule_id}")
async def delete_forwarding_rule(rule_id: str):
    try:
        result = await db.forwarding_rules.delete_one({"rule_id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"success": True}
    except Exception as e:
        logging.error(f"Error deleting rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/forwarding/rules/{rule_id}/toggle")
async def toggle_forwarding_rule(rule_id: str, background_tasks: BackgroundTasks):
    try:
        rule = await db.forwarding_rules.find_one({"rule_id": rule_id}, {"_id": 0})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        new_status = not rule['is_active']
        await db.forwarding_rules.update_one(
            {"rule_id": rule_id},
            {"$set": {"is_active": new_status}}
        )
        
        if new_status:
            # Start forwarder
            background_tasks.add_task(start_forwarder, rule['user_id'], rule_id)
        else:
            # Stop forwarder
            await stop_forwarder(rule_id)
        
        return {"success": True, "is_active": new_status}
    except Exception as e:
        logging.error(f"Error toggling rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/forwarding/logs/{user_id}")
async def get_forwarding_logs(user_id: str, limit: int = 100):
    try:
        logs = await db.forwarding_logs.find({"user_id": user_id}, {"_id": 0}).sort("forwarded_at", -1).limit(limit).to_list(limit)
        for log in logs:
            if isinstance(log['forwarded_at'], str):
                log['forwarded_at'] = datetime.fromisoformat(log['forwarded_at'])
        return {"logs": logs}
    except Exception as e:
        logging.error(f"Error getting logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background forwarder
async def start_forwarder(user_id: str, rule_id: str):
    try:
        # Get session and rule
        session_data = await db.telegram_sessions.find_one({"user_id": user_id, "is_authenticated": True}, {"_id": 0})
        rule = await db.forwarding_rules.find_one({"rule_id": rule_id}, {"_id": 0})
        
        if not session_data or not rule:
            return
        
        # Create client
        session = StringSession(session_data['session_string'])
        telegram_client = TelegramClient(session, session_data['api_id'], session_data['api_hash'])
        await telegram_client.connect()
        
        # IMPORTANT: Populate entity cache by iterating through all dialogs
        # This fixes the "Could not find the input entity for PeerUser" error
        logging.info(f"[Rule {rule_id}] Populating entity cache...")
        entity_cache = {}
        try:
            async for dialog in telegram_client.iter_dialogs():
                entity_cache[dialog.id] = dialog.entity
            logging.info(f"[Rule {rule_id}] Cached {len(entity_cache)} entities")
        except Exception as cache_error:
            logging.warning(f"[Rule {rule_id}] Error populating cache: {cache_error}")
        
        # Pre-fetch destination entity to ensure we have access
        destination_entity = None
        try:
            destination_entity = await telegram_client.get_entity(rule['destination_chat_id'])
            logging.info(f"[Rule {rule_id}] Destination entity found: {destination_entity}")
        except Exception as dest_error:
            logging.error(f"[Rule {rule_id}] Could not find destination entity: {dest_error}")
            # Try to get from cache
            if rule['destination_chat_id'] in entity_cache:
                destination_entity = entity_cache[rule['destination_chat_id']]
                logging.info(f"[Rule {rule_id}] Using cached destination entity")
            else:
                # Log failure and deactivate rule
                log = ForwardingLog(
                    rule_id=rule_id,
                    user_id=user_id,
                    message_text="Failed to start forwarder",
                    has_media=False,
                    status='failed',
                    error_message=f"Destination not accessible: {str(dest_error)[:150]}"
                )
                log_doc = log.model_dump()
                log_doc['forwarded_at'] = log_doc['forwarded_at'].isoformat()
                await db.forwarding_logs.insert_one(log_doc)
                
                await db.forwarding_rules.update_one(
                    {"rule_id": rule_id},
                    {"$set": {"is_active": False}}
                )
                return
        
        # Store client
        forwarder_key = f"{user_id}_{rule_id}"
        active_forwarders[forwarder_key] = telegram_client
        
        @telegram_client.on(events.NewMessage(chats=rule['source_chat_id']))
        async def handler(event):
            try:
                # Check if rule is still active
                current_rule = await db.forwarding_rules.find_one({"rule_id": rule_id}, {"_id": 0})
                if not current_rule or not current_rule['is_active']:
                    return
                
                message_text = event.message.text or ""
                has_media = event.message.media is not None
                media_type = None
                
                # Check keywords filter
                if rule['keywords']:
                    if not any(keyword.lower() in message_text.lower() for keyword in rule['keywords']):
                        return
                
                # Check media filter
                if rule['filter_media'] and has_media:
                    if hasattr(event.message.media, 'photo'):
                        media_type = 'photo'
                    elif hasattr(event.message.media, 'document'):
                        media_type = 'document'
                    elif hasattr(event.message.media, 'video'):
                        media_type = 'video'
                    
                    if media_type and rule['media_types'] and media_type not in rule['media_types']:
                        return
                
                # Send/forward message based on hide_source setting
                try:
                    target = destination_entity if destination_entity else rule['destination_chat_id']
                    hide_source = rule.get('hide_source', True)  # Default to True (copy without showing source)
                    
                    if hide_source:
                        # Copy the message content (won't show "Forwarded from X")
                        if event.message.media:
                            # For media messages, re-send with media
                            await telegram_client.send_message(
                                target,
                                message=message_text if message_text else None,
                                file=event.message.media
                            )
                        else:
                            # For text-only messages
                            await telegram_client.send_message(
                                target,
                                message=message_text
                            )
                    else:
                        # Forward normally (will show "Forwarded from X")
                        await telegram_client.forward_messages(
                            target,
                            event.message
                        )
                    
                    # Log success
                    log = ForwardingLog(
                        rule_id=rule_id,
                        user_id=user_id,
                        message_text=message_text[:100] if message_text else None,
                        has_media=has_media,
                        media_type=media_type,
                        status='success'
                    )
                    log_doc = log.model_dump()
                    log_doc['forwarded_at'] = log_doc['forwarded_at'].isoformat()
                    await db.forwarding_logs.insert_one(log_doc)
                    
                except Exception as forward_error:
                    # Log failure
                    error_str = str(forward_error)
                    logging.error(f"[Rule {rule_id}] Forward error: {error_str}")
                    
                    # Check if destination chat was deleted
                    if 'PEER_ID_INVALID' in error_str or 'CHAT_WRITE_FORBIDDEN' in error_str:
                        await db.forwarding_rules.update_one(
                            {"rule_id": rule_id},
                            {"$set": {"is_active": False}}
                        )
                        await stop_forwarder(rule_id)
                    
                    log = ForwardingLog(
                        rule_id=rule_id,
                        user_id=user_id,
                        message_text=message_text[:100] if message_text else None,
                        has_media=has_media,
                        media_type=media_type,
                        status='failed',
                        error_message=error_str[:200]
                    )
                    log_doc = log.model_dump()
                    log_doc['forwarded_at'] = log_doc['forwarded_at'].isoformat()
                    await db.forwarding_logs.insert_one(log_doc)
                    
            except Exception as e:
                logging.error(f"Error in forwarder handler: {e}")
        
        # Keep client running
        await telegram_client.run_until_disconnected()
        
    except Exception as e:
        logging.error(f"Error starting forwarder: {e}")

async def stop_forwarder(rule_id: str):
    # Find and disconnect client
    keys_to_remove = [key for key in active_forwarders.keys() if key.endswith(rule_id)]
    for key in keys_to_remove:
        client = active_forwarders.get(key)
        if client:
            await client.disconnect()
            del active_forwarders[key]

@api_router.get("/")
async def root():
    return {"message": "Telegram Autoforwarder API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Start all active forwarders
    active_rules = await db.forwarding_rules.find({"is_active": True}, {"_id": 0}).to_list(1000)
    for rule in active_rules:
        asyncio.create_task(start_forwarder(rule['user_id'], rule['rule_id']))

@app.on_event("shutdown")
async def shutdown_db_client():
    # Disconnect all clients
    for client_obj in active_forwarders.values():
        await client_obj.disconnect()
    client.close()