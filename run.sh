#!/bin/bash
nohup npm run start > $PWD/run.log 2>&1 &
echo $! > ./pid.file &