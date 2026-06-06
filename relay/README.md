```

/bin/ls -1 | head -n 1 | xargs -I {} -P 10 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37770 -d kjvonly/bible/kjvs/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {}

nak req  -l 3 -d kjvonly/bible/kjvs/1_1   --auth ws://localhost:3334  | jq -r '.content' | xxd -p -r | zcat  | jq
```

# strongs

```
/bin/ls -1 | grep -E '^(g|h)' |  xargs -I {} -P 10 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37770 -d kjvonly/bible/strongs/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {} 

nak req  -l 3 -d kjvonly/bible/strongs/H1   --auth ws://localhost:3334  | jq -r '.content' | xxd -p -r | zcat  | jq
```

```
/bin/ls -1  | grep 'gz' | xargs -I {} -P 12 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37775 -d kjvonly/plans/readings/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {} 


```

```
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=dev \
  -e MINIO_ROOT_PASSWORD=dev \
  minio/minio server /data --console-address ":9001"   
```

```
nak blossom upload --server http://localhost:3335 ../data/json.gz/bibleindex.json.gz
/bin/ls -1  | grep 'gz' | xargs -I {} -P 12 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37775 -d kjvonly/plans/readings/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {} 

```

nak blossom --server blossom.primal.net upload image.png | \
jq -r '.url' | \
xargs -I {} nak event --sec <your-secret> -k 37778 \
  --tag "url",{} \
  --tag "m","image/png" \
  --tag "x",$(sha256sum image.png | awk '{print $1}') \
  --tag "title","My Custom Title" \
  --tag "alt","A detailed description of the image" \
  "Check out this image!"

nak blossom upload --server <http://localhost:3335> ../data/json.gz/bibleindex.json.gz

```
/bin/ls -1  | grep 'gz' | xargs -I {} -P 12 sh -c  'nak blossom upload --server http://localhost:3335 $1' sh {}

/bin/ls -1  | grep 'gz' | xargs -I {} -P 12 sh -c 'nak event --tag x=$(sha256sum "$1" | awk "{print $1}")  -c "$1" -k 37778 -d kjvonly/bible/kjvs/"${1%%.*}" --tag "m=json.gz" --tag "url=http://localhost:3335" ws://localhost:3334' sh {} 


```
