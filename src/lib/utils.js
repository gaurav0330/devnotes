import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function copyToClipboard(text) {
  let success = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      success = true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, using fallback:", err);
  }

  if (!success) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      success = document.execCommand("copy");
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
    document.body.removeChild(textArea);
  }

  return success;
}

