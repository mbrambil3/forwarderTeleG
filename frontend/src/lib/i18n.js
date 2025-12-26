// Simple i18n system for automatic translation

const translations = {
  'pt-BR': {
    // Login Page
    'Telegram Autoforwarder': 'Telegram Autoforwarder',
    'Enter your Telegram API credentials': 'Digite suas credenciais da API do Telegram',
    'API ID': 'API ID',
    'API Hash': 'API Hash',
    'Phone Number': 'Número de Telefone',
    'Send Code': 'Enviar Código',
    'Get your API credentials from': 'Obtenha suas credenciais da API em',
    'Enter the verification code sent to your phone': 'Digite o código de verificação enviado para seu telefone',
    'Verification Code': 'Código de Verificação',
    'Verify Code': 'Verificar Código',
    'Back': 'Voltar',
    'Enter your 2FA password': 'Digite sua senha 2FA',
    '2FA Password': 'Senha 2FA',
    'Submit': 'Enviar',
    'Sending...': 'Enviando...',
    'Verifying...': 'Verificando...',
    
    // Dashboard
    'Logout': 'Sair',
    'Forwarding Rules': 'Regras de Encaminhamento',
    'Logs': 'Logs',
    'Configure automatic message forwarding': 'Configure o encaminhamento automático de mensagens',
    'Refresh': 'Atualizar',
    'New Rule': 'Nova Regra',
    'Create Forwarding Rule': 'Criar Regra de Encaminhamento',
    'Edit Forwarding Rule': 'Editar Regra de Encaminhamento',
    'Set up automatic message forwarding between chats': 'Configure o encaminhamento automático de mensagens entre chats',
    'Update the forwarding rule settings': 'Atualize as configurações da regra de encaminhamento',
    'Source Chat': 'Chat de Origem',
    'Select source chat': 'Selecione o chat de origem',
    'Destination Chat': 'Chat de Destino',
    'Select destination chat': 'Selecione o chat de destino',
    'Keywords (comma-separated, optional)': 'Palavras-chave (separadas por vírgula, opcional)',
    'Only forward messages containing these keywords. Leave empty to forward all.': 'Encaminhe apenas mensagens contendo estas palavras-chave. Deixe vazio para encaminhar todas.',
    'Filter by Media Type': 'Filtrar por Tipo de Mídia',
    'Only forward specific media types': 'Encaminhe apenas tipos específicos de mídia',
    'Hide Source': 'Ocultar Origem',
    "Don't show \"Forwarded from X\" in destination": 'Não mostrar "Encaminhado de X" no destino',
    'Cancel': 'Cancelar',
    'Create Rule': 'Criar Regra',
    'Save Changes': 'Salvar Alterações',
    'Creating...': 'Criando...',
    'Saving...': 'Salvando...',
    'No forwarding rules yet': 'Nenhuma regra de encaminhamento ainda',
    'Create your first rule to start forwarding messages': 'Crie sua primeira regra para começar a encaminhar mensagens',
    'Active': 'Ativo',
    'Inactive': 'Inativo',
    'Hidden Source': 'Origem Oculta',
    'Stop': 'Parar',
    'Start': 'Iniciar',
    'Edit': 'Editar',
    
    // Logs
    'Forwarding Logs': 'Logs de Encaminhamento',
    'Real-time log of all forwarded messages': 'Log em tempo real de todas as mensagens encaminhadas',
    'Activity Log': 'Log de Atividades',
    'Latest': 'Últimas',
    'forwarding activities': 'atividades de encaminhamento',
    'No forwarding activity yet': 'Nenhuma atividade de encaminhamento ainda',
    'Forwarded': 'Encaminhado',
    'Failed': 'Falhou',
    'Error': 'Erro',
    
    // Loading states
    'Loading your dashboard...': 'Carregando seu painel...',
    'Loading your Telegram chats...': 'Carregando seus chats do Telegram...',
    'Loading chats...': 'Carregando chats...',
    
    // Messages
    'Verification code sent to your phone!': 'Código de verificação enviado para seu telefone!',
    '2FA is enabled. Please enter your password.': '2FA está ativado. Por favor, digite sua senha.',
    'Successfully authenticated!': 'Autenticado com sucesso!',
    'Rule created successfully!': 'Regra criada com sucesso!',
    'Rule updated successfully!': 'Regra atualizada com sucesso!',
    'Rule activated!': 'Regra ativada!',
    'Rule deactivated': 'Regra desativada',
    'Rule deleted': 'Regra excluída',
    'Please select both source and destination chats': 'Por favor, selecione os chats de origem e destino',
    'Source and destination cannot be the same': 'Origem e destino não podem ser iguais',
    'Error loading chats': 'Erro ao carregar chats',
    'Error loading rules': 'Erro ao carregar regras',
  },
  'pt': {
    // Alias for pt-BR
  },
  'en': {
    // English is the default, no translations needed
  }
};

// Copy pt-BR to pt
translations['pt'] = { ...translations['pt-BR'] };

// Get browser language
export function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || 'en';
  // Return just the language code (e.g., 'pt' from 'pt-BR')
  return lang;
}

// Get full language with region
export function getFullLanguage() {
  return navigator.language || navigator.userLanguage || 'en';
}

// Translate function
export function t(text, lang = null) {
  const language = lang || getBrowserLanguage();
  
  // Try exact match first (e.g., 'pt-BR')
  if (translations[language] && translations[language][text]) {
    return translations[language][text];
  }
  
  // Try language without region (e.g., 'pt' from 'pt-BR')
  const baseLang = language.split('-')[0];
  if (translations[baseLang] && translations[baseLang][text]) {
    return translations[baseLang][text];
  }
  
  // Return original text if no translation found
  return text;
}

// Create a React hook for translations
export function useTranslation() {
  const language = getBrowserLanguage();
  
  const translate = (text) => t(text, language);
  
  return { t: translate, language };
}

export default { t, getBrowserLanguage, getFullLanguage, useTranslation };
