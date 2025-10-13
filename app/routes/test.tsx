"use client";

import React, { useState } from "react";
import { init, type User } from "@instantdb/react";

// ID for app: etalasee
const APP_ID = "b673f695-a5dd-4f7c-b3bd-79aa7f075886";
const db = init({ appId: APP_ID });

function App() {
	return (
		<>
			<db.SignedIn>
				<Main />
			</db.SignedIn>
			<db.SignedOut>
				<Login />
			</db.SignedOut>
		</>
	);
}

function Main() {
	const user = db.useUser() as User;

	console.log(user.isGuest);
	return (
		<div className="space-y-4 p-4">
			<h1 className="text-2xl font-bold">
				Hello {user.isGuest ? "Guest" : user.email}!
			</h1>
			<button
				onClick={() => db.auth.signOut()}
				className="bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
			>
				Sign out
			</button>
		</div>
	);
}

function Login() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="max-w-sm">
				<button
					onClick={() => db.auth.signInAsGuest()}
					className="w-full bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
				>
					Sign in as Guest
				</button>
			</div>
		</div>
	);
}

export default App;
