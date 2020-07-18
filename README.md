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