import React from 'react';
import { Hello } from './Hello.jsx';
import { Info } from './Info.jsx';
import { LoginForm } from './LoginForm.jsx';

export const App = () => (
  <div>
    <h1>Welcome to Meteor!</h1>
    <LoginForm/>
    <Hello/>
    <Info/>
  </div>
);
