import { Meteor } from 'meteor/meteor';
import React from 'react';

export const Logout = () => {
    $('#logOutMessage').eq(0).hide();
    const logOutUser = e => {
        e.preventDefault();

        Meteor.logout();
        $('#logOutMessage')[0].textContent = 'Logout successful';
        $('#logOutMessage').eq(0).show();
    }

    return (
        <div>
            <button onClick={logOutUser}>Log out</button>
            <p id="logOutMessage"></p>
        </div>
    );
};