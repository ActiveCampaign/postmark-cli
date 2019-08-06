import {DataFormat} from "./DataFormat";

export class JSONFormat extends DataFormat{
  public getData(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}