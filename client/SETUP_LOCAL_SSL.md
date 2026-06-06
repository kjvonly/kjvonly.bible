# SETUP LOCAL SSL

```
openssl req -x509 -nodes -new -sha256 -days 390 -newkey rsa:2048 \
 -keyout RootCA.key -out RootCA.pem -subj "/C=US/CN=Local Development CA"
openssl x509 -outform pem -in RootCA.pem -out RootCA.crt
```

```

```

cp app.local.ext .certs/

```


```

authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = app.local
DNS.2 = \*.app.local

```

```

# Generate private key and CSR

openssl req -new -nodes -newkey rsa:2048 \
 -keyout app.local.key -out app.local.csr \
 -subj "/C=US/ST=State/L=City/O=Dev/CN=app.local"

# Sign the CSR with your root CA

openssl x509 -req -sha256 -days 1024 \
 -in app.local.csr -CA RootCA.pem -CAkey RootCA.key -CAcreateserial \
 -extfile app.local.ext -out app.local.crt

```

```

```

```
