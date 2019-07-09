import * as postmark from "postmark";
import {Template, Templates} from "postmark/dist/client/models";

export enum TokenType {
  Account = 'account',
  Server = 'server'
}

export class ServerRequest {
  private token: string;
  private client: postmark.ServerClient;

  constructor(token: string) {
    this.token = token;
    this.client = new postmark.ServerClient(token);
  }

  public sendEmailWithTemplate(id: number | undefined, alias: string | undefined,
                               from: string, to: string | undefined,
                               model: any | undefined): Promise<postmark.Models.MessageSendingResponse> {

    return this.client.sendEmailWithTemplate({
      TemplateId: id || undefined, TemplateAlias: alias || undefined,
      From: from, To: to, TemplateModel: model ? JSON.parse(model) : undefined
    })
  }

  public sendEmail(from: string, to: string, subject: string,
                   html: string | undefined, text: string | undefined): Promise<postmark.Models.MessageSendingResponse> {

    return this.client.sendEmail({
      From: from, To: to, Subject: subject,
      HtmlBody: html || undefined, TextBody: text || undefined
    })
  }

  public getTemplates(): Promise<Templates> {
    return this.client.getTemplates()
  }

  public getTemplate(id: string|number): Promise<Template> {
   return this.client.getTemplate(id)
  }
}

