import React, { Component } from 'react'
import axios from 'axios'

const defaultIndex = ''

class Fib extends Component {
  state = {
    seenIndexes: [],
    values: {},
    index: ''
  }

  handleSubmit = async (event) => {
    event.preventDefault()
    const { index } = this.state
    const postBody = { index }
    await axios.post('/api/values', postBody)

    this.setState({ index: defaultIndex })
  }

  componentDidMount() {
    this.fetchValues()
    this.fetchIndexes()
  }

  async fetchValues() {
    const values = await axios.get('/api/values/current')
    this.setState({ values: values.data })
  }

  async fetchIndexes() {
    const seenIndexes = await axios.get('/api/values/all')
    this.setState({ seenIndexes: seenIndexes.data })
  }

  renderSeenIndexes() {
    const { seenIndexes } = this.state
    return seenIndexes.map(({ number }) => number).join(', ')
  }

  renderValues() {
    const entries = []

    for (let key in this.state.values) {
      entries.push(
        <div key={key}>
          For index {key}, I calculated {this.state.values[key]}
        </div>
      )
    }
    return entries
  }

  render() {
    const { index } = this.state
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <label>Enter your index:</label>
          <input
            value={index}
            onChange={e => this.setState({ index: e.target.value })}
          />
          <button>Submit</button>
        </form>

        <div>
          <h3>Indexes I have seen:</h3>
          {
            this.renderSeenIndexes()
          }
        </div>

        <div>
          <h3>Calculated Values</h3>
          {
            this.renderValues()
          }
        </div>
      </div>
    )
  }
}

export default Fib
