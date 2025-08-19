import React from "react";
import { assets } from "../assets/assets";
import { Star } from "lucide-react";
import { SignIn } from "@clerk/clerk-react";

function Login() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Background Image */}
      <img
        src={assets.bgImage}
        alt="Background"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-white/60" />

      {/* Left Side: Branding */}
      <div className="relative flex-1 flex flex-col items-start justify-start gap-4 p-6 md:p-10 lg:pl-40">
        <img
          src={assets.logo}
          alt="Askio Logo"
          className="h-10 object-contain"
        />

        {/* User icon + rating */}
        <div className="flex items-center gap-3 mb-4 max-md:mt-10">
          <img
            src={assets.group_users}
            alt="Users"
            className="h-12 md:h-12"
          />
          <div className="flex flex-col items-start">
            <div className="flex">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 text-amber-500 fill-amber-500"
                  />
                ))}
            </div>
            <p className="text-black text-sm">
              Used by 15k+ users
            </p>
          </div>
        </div>

        <h1 className="text-3xl md:text-6xl font-bold bg-gradient-to-r from-indigo-950 to-indigo-800 bg-clip-text text-transparent">
          Solve your doubts with Askio
        </h1>
        <p className="text-gray-700 text-sm md:text-base max-w-md">
          Askio is a platform where you can ask questions and get answers from
          the community. Join now and start solving your doubts!
        </p>
      </div>

      {/* Right Side: Login Form */}
      <div className="relative flex-1 flex items-center justify-center p-6 md:p-10 lg:pr-40">
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 shadow border">
          <SignIn />
        </div>
      </div>
    </div>
  );
}

export default Login;