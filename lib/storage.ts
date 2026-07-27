export const MATERIALS_BUCKET = "materials";
export const MAX_MATERIAL_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export function buildMaterialStoragePath(classId: string, fileName: string): string {
  return `${classId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}
