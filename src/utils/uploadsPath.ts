import path from 'path';

/**
 * Resolve the absolute path to the uploads/documents directory.
 *
 * In production, __dirname (from this file, dist/utils/) resolves up to
 * dist/ and then into uploads/documents.
 * In development, uses process.cwd()/src/uploads/documents.
 */
export const getUploadsDir = (): string => {
  if (process.env.NODE_ENV === 'production') {
    // In production, __dirname is dist/utils/
    // Go up to dist/ and then to uploads/documents
    return path.join(__dirname, '..', 'uploads', 'documents');
  } else {
    return path.join(process.cwd(), 'src', 'uploads', 'documents');
  }
};

export default getUploadsDir;
