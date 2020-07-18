const keys = require('./keys')
const redis = require('redis')

const { redisHost, redisPort } = keys

const redisClient = redis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000 // tells redis to attempt reconnection once every sec
})
const subscription = redisClient.duplicate()

const fib = (index) => {
  if (index < 2) return 1
  return fib(index - 1) + fib(index - 2) // make it recursive to simulate why we need separate worker process
}

subscription.on('message', (channel, message) => {
  const parsedIndex = parseInt(message, 10)
  const calcValue = fib(parsedIndex)

  // Insert calcValue into hash called values, with key/value pair of message and calcValue
  redisClient.hset('values', message, calcValue)
})
// When insert event occurs into redis, we get the value and put into redis instance
subscription.subscribe('insert')
