#!/bin/bash
# plans

pushd ../../../data/plans.json.gz/
/bin/ls -1  |  grep '^[[:alpha:]]' | xargs -I {} -P 12 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37775 -d kjvonly/plans/readings/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {} 
popd
