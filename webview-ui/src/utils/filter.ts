import { ImpactFile } from '../api';

/** Filter out meta files that aren't user-facing business code */
export function filterBusinessFiles(files: ImpactFile[]): ImpactFile[] {
  return files.filter(
    (f) => !f.path.startsWith('.vibe') && !f.path.includes('/.vibe')
  );
}
