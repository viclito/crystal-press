import "server-only";
import fs from "fs";
import path from "path";
import {
  WhatsAppTemplateKey,
  WhatsAppTemplate,
  DEFAULT_WHATSAPP_TEMPLATES,
} from "./whatsapp-templates";

const TEMPLATE_STORE_DIR = path.join(process.cwd(), "data");
const TEMPLATE_STORE_FILE = path.join(TEMPLATE_STORE_DIR, "whatsapp-templates.json");

/**
 * Loads customized template dictionary from file or returns default
 */
export function getStoredTemplateCustomizations(): Record<string, string> {
  try {
    if (fs.existsSync(TEMPLATE_STORE_FILE)) {
      const data = fs.readFileSync(TEMPLATE_STORE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Failed to read whatsapp-templates.json, using defaults:", err);
  }
  return {};
}

/**
 * Saves customized template dictionary
 */
export function saveTemplateCustomization(key: WhatsAppTemplateKey, customText: string): boolean {
  try {
    if (!fs.existsSync(TEMPLATE_STORE_DIR)) {
      fs.mkdirSync(TEMPLATE_STORE_DIR, { recursive: true });
    }
    const current = getStoredTemplateCustomizations();
    current[key] = customText.trim();
    fs.writeFileSync(TEMPLATE_STORE_FILE, JSON.stringify(current, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save whatsapp template customization:", err);
    return false;
  }
}

/**
 * Resets a single template to factory default
 */
export function resetTemplateToDefault(key: WhatsAppTemplateKey): boolean {
  try {
    if (!fs.existsSync(TEMPLATE_STORE_FILE)) return true;
    const current = getStoredTemplateCustomizations();
    if (key in current) {
      delete current[key];
      fs.writeFileSync(TEMPLATE_STORE_FILE, JSON.stringify(current, null, 2), "utf-8");
    }
    return true;
  } catch (err) {
    console.error("Failed to reset whatsapp template:", err);
    return false;
  }
}

/**
 * Returns all templates populated with any user customizations
 */
export function getAllWhatsAppTemplates(): WhatsAppTemplate[] {
  const customizations = getStoredTemplateCustomizations();

  return Object.values(DEFAULT_WHATSAPP_TEMPLATES).map((template) => {
    const custom = customizations[template.key];
    return {
      ...template,
      customMessage: custom || template.defaultMessage,
    };
  });
}

/**
 * Returns the effective message template for a given key
 */
export function getEffectiveTemplateText(key: WhatsAppTemplateKey): string {
  const customizations = getStoredTemplateCustomizations();
  if (customizations[key] && customizations[key].trim().length > 0) {
    return customizations[key];
  }
  return DEFAULT_WHATSAPP_TEMPLATES[key]?.defaultMessage || "";
}
