# Postmark CLI

## Install

- Install [Node.js](https://nodejs.org/en/)
- Run `npm i postmark-cli -g`
- Run `postmark`

```bash
# Commands
postmark email <command> [options]      Send an email
postmark servers <command> [options]    Manage your servers
postmark templates <command> [options]  Manage your templates

# Options
--version  Show version number
--help     Show help
```

## email

Send an email via Postmark.

### raw

Send a raw email.

```bash
postmark email raw --from="" --to="" --subject="howdy" --htmlbody="<h1>Hi there</h1>" --textbody="Hi there"

# Pass server token
POSTMARK_SERVER_TOKEN=token  email raw --from="" --to="" --subject="howdy" --htmlbody="<h1>Hi there</h1>" --textbody="Hi there"

# Options
--from, -f  Email address you are sending from. Must be an address on a
            verified domain or confirmed Sender Signature. [string] [required]
--to, -t    Email address you are sending to               [string] [required]
--subject   The subject line of the email                  [string] [required]
--htmlbody  The HTML version of the email                             [string]
--textbody  The text version of the email                             [string]
```

### template

Send a templated email.

```bash
postmark email template --alias="" --from="" --to="" --model='{"name": "Jane"}'

# Pass server token
POSTMARK_SERVER_TOKEN=token postmark email template --alias="" --from="" --to="" --model='{"name": "Jane"}'

# Options
--id, -i     Template ID                                              [string]
--alias, -a  Template Alias                                           [string]
--from, -f   Email address you are sending from. Must be an address on a
             verified domain or confirmed Sender Signature.[string] [required]
--to, -t     Email address you are sending to              [string] [required]
--model, -m                                                           [string]
```

## servers

### list

Get a list of all servers on an account, including server tokens.

```bash
postmark servers list

# Pass account token
POSTMARK_ACCOUNT_TOKEN=token postmark servers list

# Options
--count, -c   Number of servers to return                             [number]
--offset, -o  Number of servers to skip                               [number]
--name, -n    Filter servers by name                                  [string]
```

## templates

**⚠️ Before you get started**, make sure that each of your templates have an alias defined. Check out our [help doc](https://postmarkapp.com/support/article/1117-how-do-i-use-a-template-alias) for more info.

### pull &lt;output directory&gt;

Download templates from a Postmark server to your local file system.

```bash
postmark templates pull ~/Desktop/templates
```

Here’s an example of the directory structure that is downloaded to the local file system:

```bash
my_templates
├── password_reset
│   ├── content.html
│   ├── content.txt
│   └── meta.json
└── welcome
    ├── content.html
    └── meta.json
```

You can rename each template’s directory to whatever you prefer, we only require that the directory structure stays intact and the filenames(`content.html`, `content.txt`, `meta.json`) are not renamed.

### push &lt;templates directory&gt; [opts]

Push templates from your local file system to Postmark.

```bash
postmark templates push ~/Desktop/templates
```

By default, the command will ask you to confirm your changes before pushing. To disable this, set the `-c` flag to `false`.

```bash
postmark templates push ~/Desktop/templates -c=false
```
