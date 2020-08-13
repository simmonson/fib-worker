# Dockerizing multiple containers and deploying them for production

Look at the `docker-compose.yml` file in the root directory. Notice how we can't just add `.` anymore since the `docker-compose.yml` file is outside of each application directory (client, server, worker).

Look at how we define volumes for the server container:
```
  volumes:
  - /app/node_modules // lock this so it doesn't look for changes here in the local app
  - ./server:/app // this will watch for changes in the server directory
```
Remember we map the local directory to working directory that we defined in the docker container in `server`'s `Dockerfile.dev`:
```
WORKDIR '/app'
```
So we can tell what to lock INSIDE the docker container, but when we map, we have to map the local directory structure to the working directory structure in the docker container.

## Docker Compose Structure
```
version: 'something'
services:
  postgres:
    image: 'postgres:latests'
    environment:
      - POSTGRES_PASSWORD=postgres_password
  redis:
    image: 'redis:latest'
  server:
    build:
    volumes:
    environment:

```

The `build` part are the build configs to tell docker how to build an image out of our source code. You need to define the context and dockerfile like this:
```
build:
  context: ./server
  dockerfile: Dockerfile.dev
```

## Nginx Routing
We need to configure a file called `default.conf`. It is a file added to nginx image to implement a set of routing rules for nginx. [See image here](./readme-images/nginx-routing.png)

Nginx watches for requests and refers to "upstream servers" that it can redirect request traffic to. These upstream servers cannot be reached until the request hits Nginx first, where Nginx then decides which server the request should be directed.

The port numbers for each upstream servers is defined in each application.

Remember that the different services names defined in `docker-compose.yml` These services names are used as a kind of domain - Nginx can then refer to these domain names to access the service that hosts its application.

See `./nginx/default.conf` for reference.

For api routing, we have something like this:
`rewrite /api/(.*) /$1 break;`

The `/$1` is a reference to whatever was matched in the `(.*)` regex. Then, it will replace `/api/(.*)`.
The `break` keyword is a directive that prevents any further rewrite rules.

Now we need a custom nginx image in its own container to communicate with the other container that contains our app images.

## Dockerfile for Nginx Custom image
See `./nginx/Dockerfile.dev` for reference.

Once we create this dockerfile, we need to add the nginx service to `docker-compose.yml`. Ensure that we have a restart policy because this service is always proxying traffic towards a specific upstream server, so we always want this service up and active:
```
nginx:
    restart: always
    build:
      context: ./nginx
      dockerfile: Dockerfile.dev
    ports:
      - '3050:80'
```

## Starting up Docker Compose
`docker-compose down && docker-compose up --build`: `--build` to force a rebuild when changing docker compose configuration

### TROUBLESHOOTING: There can be an edge case where the nginx upstream connection fails after building the container:


Problem: `connect() failed (111: Connection refused) while connecting to upstream, client:[DOCKER INTERNAL IP], server:, request: "GET / HTTP/1.1", upstream: [NETWORK IP]`

Solution: 
```
 nginx:
    depends_on:
      - api
      - client
```      

When entering application via `localhost:3050`, if you see "I calculated Nothing yet!" for each index entered, we can try:
```
worker:
  environment:
    - REDIS_HOST=redis
    - REDIS_PORT=6379
```
as well as
```
api:
  depends_on:
    - postgres
```
See [depends on](https://docs.docker.com/compose/compose-file/#depends_on) for reference.

We get a websocket error in when starting up the application on `localhost:3050`. This is because we haven't set any websocket communication to go through when we make changes to the local source code. To fix this, we need to do:
```
location /sockjs-node {
    proxy_pass http://client;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
  }
```
in the `/nginx/default.conf` file.

## Finalizing dockerfiles
At this point we can create multiple production `Dockerfile`s. Notice how each of `client`, `server`, `nginx`, and `worker` have `Dockerfile` and `Dockerfile.dev`. The prod `Dockerfile` manages production deployment (See `/nginx` for a clear difference to use the right `.conf` files)

For the client, since this is the UI the user will access, we need to ensure that there is a separate nginx server that serves the react production files and exposes the port to the routing nginx server. This is different than the first nginx (that handles upstream server requests). [See image for details](./readme-images/nginx-for-ui.png)

## Setting up travis.yml and creating aws elastic beanstalk

We will use travis-ci to build dev env apps, run tests, and upon passed tests, build a prod app and push the images to docker hub. Then the elastic beanstalk will be alerted of any future updates to the docker hub.


### Travis CI Flow:

[Diagram here](./readme-images/travis-ci-multi-deployment-flow.png)

```
before_install:
  - docker build -t simmonson/react-test -f ./client/Dockerfile.dev ./client
```

• `-t simmonson/react-test`: tag image with docker id and image name    
• `-f ./client/Dockerfile.dev`: Specify the dockerfile to be used    
• `./client`: The build context. In some dockerfiles, we have previously defined this as `.` because it's in the current root dir.    

Now, we need to specify the nested folder `./client` as the build context - look into the client dir to get the build context

Since we only have tests for the UI, we have just this one line. Here is where you will build more docker images to prep the test step.

### Define script to run

```
script:
  - docker run simmonson/react-test npm test -- --coverage
```

• `run simmonson/react-test`: Run the docker container of the specified image.    
• We need it to exit with code 0, any other code is a fail. We also need to override the default npm run command with `npm test`    
• `-- --coverage`: To override the watch mode of `npm run test`, we need these flags to exit upon test completion with a 0 or non 0.    

### After success:
Build images for production by tagging an image name and defining the context:
```
- docker build -t simmonson/multi-client ./client
- docker build -t simmonson/multi-nginx ./nginx
- docker build -t simmonson/multi-server ./server
- docker build -t simmonson/multi-worker ./worker
```

Then, we need to push these images to docker hub. But before that, we need to login via docker CLI. To do this, we can add a step:
```
  # Log in to docker CLI
  - echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_ID" --password-stdin
```

• `-echo "$DOCKER_PASSWORD"`: Retrieves value stored in travis-ci's env variables and uses it in next cli cmd via `stdin`        
• `docker login -u "$DOCKER_ID"`: use docker CLI to login with the `DOCKER_ID` env variable    
• `--password-stdin`: Expects password to be received (password is the prompt from docker CLI) via stdin, which is from the left hand side of the pipe.    
