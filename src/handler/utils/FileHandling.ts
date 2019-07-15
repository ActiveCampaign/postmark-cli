import untildify from "untildify";
import {ensureDirSync, existsSync, outputFileSync, readFileSync, readJsonSync} from "fs-extra";
import traverse from 'traverse';
import dirTree from 'directory-tree';
import {dirname} from "path";

import {FileDetails} from "../../types";

export class FileHandling {
  public directoryPath(path: string): string {
    return dirname(path);
  }

  public fileExists(path: string): boolean {
    return this.directoryExists(path);
  }

  public directoryExists(path: string): boolean {
    return existsSync(untildify(path));
  };

  public  ensureDirectoryExists(path: string): void  {
    ensureDirSync(path);
  };

  public  directoryFullPath(path: string):string {
    return untildify(path);
  };

  public saveFile(path: string,content: string | undefined): void {
    outputFileSync(path, content);
  };

  public readFile(path: string, encoding: string = 'utf-8'): string {
    return readFileSync(path, encoding)
  }

  public readToJSON(path: string): any {
    return readJsonSync(path);
  }

  public findFiles(path: string, fileName: string): FileDetails[] {
    return traverse(dirTree(path)).reduce((acc, file) => {
      if (file.name === fileName) { acc.push(file); }
      return acc
    }, []);
  }

}
