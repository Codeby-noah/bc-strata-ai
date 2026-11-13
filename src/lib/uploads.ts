/** Maximum upload size for strata PDFs and invoice files (50 MB per product spec). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function maxUploadLabel() {
  return "50 MB";
}
