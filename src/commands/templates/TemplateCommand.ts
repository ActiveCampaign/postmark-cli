import {CommandHandler} from "../../handler/CommandHandler";
import {FileDetails, TemplateManifest, TemplateMetaFile} from "../../types";
import {join} from "../../handler/utils/Various";

export abstract class TemplateCommand extends CommandHandler {
  protected readonly layoutDirectory: string = '_layouts';
  protected readonly metadataFilename: string = 'meta.json';
  protected readonly textContentFilename: string = 'content.txt';
  protected readonly htmlContentFilename: string = 'content.html';

  protected constructor(command: string, description: string, options: any) {
    super(command, description, options);
  }

  /**
   * Folder from which templates need to be retrieved and pushed exists?
   *
   * @param {string} path - local templates directory
   */
  protected validateTemplatesDirectoryExists(path: string): void {
    if (!this.fileUtils.directoryExists(path)) {
      throw Error('Templates folder does not exist');
    }
  }

  /**
   * Template exists in local directory?
   *
   * @param {string} directory
   */
  protected validateLocalTemplatesExist(directory: string): void {
    if (!this.fileUtils.directoryExists(directory)) {
      throw Error('No templates or layouts were found.');
    }
  }

  /**
   * Get all the local templates details on your machine.
   * @param {string} path - folder where templates are stored
   * @return {TemplateManifest[]} - list of templates
   */
  protected retrieveTemplatesFromDirectory(path: string): TemplateManifest[] {
    let localTemplatesToPush: TemplateManifest[] = [];
    const metaFiles: FileDetails[] = this.fileUtils.findFiles(path, this.metadataFilename);

    metaFiles.forEach((file: FileDetails) => {
      const item: TemplateMetaFile | null = this.retrieveTemplateFromFile(this.fileUtils.directoryPath(file.path));
      if (item) localTemplatesToPush.push(item)
    });

    return localTemplatesToPush;
  }

  /**
   * Get details of the template stored in a directory.
   * @param {string} directory - where template is stored
   * @return {TemplateMetaFile | null} - template details
   */
  protected retrieveTemplateFromFile(directory: string): TemplateMetaFile | null {
    const metaFilePath: string = join(directory, this.metadataFilename);
    const htmlPath: string = join(directory, this.htmlContentFilename);
    const textPath: string = join(directory, this.textContentFilename);

    if (this.fileUtils.fileExists(metaFilePath)) {
      const metaFile: TemplateMetaFile = this.fileUtils.readToJSON(metaFilePath);
      const htmlFile: string = this.fileUtils.directoryExists(htmlPath) ? this.fileUtils.readFile(htmlPath) : '';
      const textFile: string = this.fileUtils.directoryExists(textPath) ? this.fileUtils.readFile(textPath) : '';

      return {HtmlBody: htmlFile, TextBody: textFile, ...metaFile};
    }
    else {
      return null;
    }
  }
}