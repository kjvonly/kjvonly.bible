## Local SSL

Local HTTPS uses a dev root CA and an `app.local` certificate.

Certs are written to:

```text
.certs/
```

### Generate certificates

```bash
make ssl
```

This creates:

```text
.certs/RootCA.key
.certs/RootCA.pem
.certs/RootCA.crt
.certs/app.local.key
.certs/app.local.csr
.certs/app.local.crt
.certs/app.local.ext
```

### Trust the local CA on macOS

```bash
make ssl-trust
```

### Clean certificates

```bash
make ssl-clean
```

### Domains

The generated cert supports:

```text
app.local
*.app.local
```