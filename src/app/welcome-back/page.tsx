"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Sparkles } from "lucide-react";
import Image from "next/image";

export default function WelcomeBackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending, refetch } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Force refetch session to ensure fresh data
    const initializeSession = async () => {
      await refetch();
    };
    
    initializeSession();
  }, [refetch]);

  useEffect(() => {
    if (!isPending && session?.user) {
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        // Ensure we have the latest session data
        const role = (session.user as any).role;
        
        // Log for debugging (remove in production)
        console.log("Welcome back - User role:", role, "User:", session.user);
        
        // Default to worker if role is undefined
        const userRole = role || "worker";
        
        if (userRole === "employer") {
          router.push("/dashboard/employer");
        } else if (userRole === "admin") {
          router.push("/admin/dashboard");
        } else {
          // Default to worker dashboard
          router.push("/dashboard");
        }
      }, 2500);

      return () => clearTimeout(timer);
    } else if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router, searchParams]);

  if (isPending || !session) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-20"
        >
          <source
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_videos/smooth-abstract-digital-particles-flowin-89da2e10-20251030164323.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-purple-900/20 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8 px-6 opacity-0 translate-y-8 animate-[fadeInUp_0.8s_ease-out_forwards] max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_images/modern-minimalist-logo-design-for-taskin-143be8c6-20251031064733.jpg"
            alt="TaskInn Logo"
            width={200}
            height={80}
            className="h-20 w-auto brightness-0 invert"
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-teal-400 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-medium text-white">
              Welcome Back
            </h1>
            <Sparkles className="h-8 w-8 text-purple-400 animate-pulse" />
          </div>
          
          <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 bg-[length:200%_200%] animate-[gradient_3s_ease_infinite]">
            {session.user.name}
          </p>
        </div>

        {/* User Info */}
        <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          {session.user.image || (session.user as any).profilePicture ? (
            <Image
              src={session.user.image || (session.user as any).profilePicture}
              alt={session.user.name || "User"}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full border-2 border-teal-400 object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          
          <div className="text-left">
            <p className="text-lg font-medium text-white">
              {session.user.email}
            </p>
            <p className="text-sm text-gray-400 capitalize">
              {(session.user as any).role || "Worker"} Account
            </p>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xl text-gray-300 max-w-md mx-auto">
          Great to see you again! Redirecting you to your dashboard...
        </p>

        {/* Loading Indicator */}
        <div className="flex justify-center items-center gap-2 pt-8">
          <div className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}