import * as postmark from "postmark";

export class AccountRequest {
  private token: string;
  private client: postmark.AccountClient;

  constructor(token: string) {
    this.token = token;
    this.client = new postmark.AccountClient(token);
  }

  public getServers(count: number, offset: number, name: string): Promise<postmark.Models.Servers> {
    const filterParameters = {
      ...(count && { count: count }),
      ...(offset && { offset: offset }),
      ...(name && { name: name }),
    };

    return this.client.getServers(filterParameters)
  }
}