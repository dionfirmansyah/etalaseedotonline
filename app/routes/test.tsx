"use client";

import React, { useState } from "react";
import { init, type User } from "@instantdb/react";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

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
		<div className="flex flex-col min-h-screen items-center justify-center">
			<div className="max-w-sm">
				<button
					onClick={() => db.auth.signInAsGuest()}
					className="w-full bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
				>
					Sign in as Guest
				</button>
			</div>



      {/* Subdomain */}
      <div className="space-y-2">
        <Label htmlFor="subdomain">
          Alamat Toko <span className="text-destructive">*</span>
        </Label>
        <div className="flex">
          <div className="relative flex-1">
            <Input
              id="subdomain"
              placeholder="nama-toko"

              maxLength={32}
              className={`rounded-r-none border-r-0 pr-8 `}
            />
           
          </div>
          {/* Suffix */}
          <div className="h-9 px-3 flex items-center bg-muted border border-border rounded-r-md text-sm text-muted-foreground whitespace-nowrap select-none">
            .etalasee.online
          </div>
        </div>


			
		</div>
		</div>
	);
}

export default App;
