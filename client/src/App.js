import React from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'

import './App.css';

import Fib from './Pages/Fib'
import OtherPage from './Pages/OtherPage'

function App() {
  return (
    <Router>
      <div className="App">
        <div>TESTING A CHANGE</div>
        <div>
          <Link to="/">Home</Link>
          <Link to="/otherpage">Other Page</Link>
        </div>
        <div>
          <Route exact path="/" component={Fib} />
          <Route exact path="/otherpage" component={OtherPage} />
        </div>
      </div>
    </Router>
  );
}

export default App;
