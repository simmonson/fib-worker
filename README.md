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
      