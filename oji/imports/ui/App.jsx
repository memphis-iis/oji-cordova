import React from 'react';
import { Hello } from './Hello.jsx';
import { Info } from './Info.jsx';
import Blaze from 'meteor/gadicc:blaze-react-component';

export const App = () => (
  <div>
    <h1>Welcome to OJI!</h1>
    <Blaze template="login"/>
  </div>
);