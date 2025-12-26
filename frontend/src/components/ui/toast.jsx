import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function Toast({ children }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}

export { toast } from "sonner";