"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { ArrowRight, ArrowLeft, Briefcase, Clock, Star, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Princess",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    profilePicture: PRESET_AVATARS[0],
    bio: "",
    phone: "",
    interests: [] as string[],
    skills: [] as string[],
    availability: "flexible",
  });

  // Detect user role and redirect if already completed onboarding
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }

    if (!isPending && session?.user) {
      // Check if onboarding is already completed
      const user = session.user as any;
      if (user.onboardingCompleted) {
        toast.info("You have already completed onboarding!");
        router.push("/welcome-back");
        return;
      }

      // Check user role - if employer, different onboarding needed
      const role = user.role || "worker";
      if (role === "employer") {
        // For employers, we can skip the worker-specific steps
        // They might need different onboarding
        // For now, let's allow them to complete basic profile setup
      }
    }
  }, [session, isPending, router]);

  const interestOptions = [
    "Data Entry",
    "Content Writing",
    "Social Media",
    "Research",
    "Testing",
    "Translation",
    "Design",
    "Video Editing",
  ];

  const skillOptions = [
    "Fast Typing",
    "Attention to Detail",
    "Creative Writing",
    "Photo Editing",
    "Video Production",
    "Market Research",
    "Quality Assurance",
    "Language Skills",
  ];

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${session.user.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("bearer_token")}`,
        },
        body: JSON.stringify({
          profilePicture: formData.profilePicture,
          bio: formData.bio,
          phone: formData.phone,
          interests: JSON.stringify(formData.interests),
          skills: JSON.stringify(formData.skills),
          availability: formData.availability,
          onboardingCompleted: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      toast.success("Profile setup complete!");
      
      // Redirect based on role
      const userRole = (session.user as any).role || "worker";
      setTimeout(() => {
        if (userRole === "employer") {
          router.push("/dashboard/employer");
        } else if (userRole === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1000);
    } catch (error) {
      console.error("Profile setup error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isPending || !session) {
    return null;
  }

  const totalSteps = 4;
  const userRole = (session.user as any).role || "worker";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/5289a710-af5c-41be-91c0-17bd70aee84a/generated_images/modern-minimalist-logo-for-taskinn-a-pro-7f90acf1-20251031063352.jpg"
              alt="TaskInn Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <span className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-32 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Profile Picture */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-medium text-black">
                  Choose Your Avatar
                </h2>
                <p className="text-gray-600 text-lg">
                  Select a profile picture to personalize your {userRole === "employer" ? "employer" : "worker"} account
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                {PRESET_AVATARS.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => setFormData({ ...formData, profilePicture: avatar })}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${
                      formData.profilePicture === avatar
                        ? "border-black scale-110 shadow-lg"
                        : "border-gray-200 hover:border-gray-300 hover:scale-105"
                    }`}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={avatar}
                        alt={`Avatar ${index + 1}`}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    {formData.profilePicture === avatar && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep(2)}
                  className="bg-black hover:bg-black/90 text-white rounded-full px-8 py-6 text-base"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Bio & Contact */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-medium text-black">
                  Tell Us About Yourself
                </h2>
                <p className="text-gray-600 text-lg">
                  Share a bit about your background and interests
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 transition-all outline-none resize-none"
                    placeholder="Tell us about yourself, your experience, and what you're looking for..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 transition-all outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="rounded-full px-8 py-6 text-base"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  className="bg-black hover:bg-black/90 text-white rounded-full px-8 py-6 text-base"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Interests & Skills */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-medium text-black">
                  Your Interests & Skills
                </h2>
                <p className="text-gray-600 text-lg">
                  {userRole === "employer" 
                    ? "Select the areas you're interested in hiring for"
                    : "Select the areas you're interested in working on"
                  }
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-black mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-3">
                    {interestOptions.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => handleInterestToggle(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.interests.includes(interest)
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-black mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-3">
                    {skillOptions.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => handleSkillToggle(skill)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.skills.includes(skill)
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="rounded-full px-8 py-6 text-base"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="bg-black hover:bg-black/90 text-white rounded-full px-8 py-6 text-base"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Availability */}
          {currentStep === 4 && (
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-medium text-black">
                  {userRole === "employer" ? "Business Availability" : "Work Availability"}
                </h2>
                <p className="text-gray-600 text-lg">
                  {userRole === "employer"
                    ? "How often will you be posting tasks?"
                    : "When are you available to work on tasks?"
                  }
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { value: "fulltime", label: "Full-time", desc: userRole === "employer" ? "Daily task postings" : "40+ hours per week", icon: Briefcase },
                  { value: "parttime", label: "Part-time", desc: userRole === "employer" ? "Weekly task postings" : "20-40 hours per week", icon: Clock },
                  { value: "flexible", label: "Flexible", desc: userRole === "employer" ? "As needed" : "As time permits", icon: Star },
                ].map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFormData({ ...formData, availability: value })}
                    className={`w-full flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                      formData.availability === value
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                    <div className="text-left flex-1">
                      <div className="font-medium text-lg">{label}</div>
                      <div className={`text-sm ${formData.availability === value ? "text-gray-300" : "text-gray-500"}`}>
                        {desc}
                      </div>
                    </div>
                    {formData.availability === value && (
                      <Check className="h-6 w-6" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => setCurrentStep(3)}
                  variant="outline"
                  className="rounded-full px-8 py-6 text-base"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-black hover:bg-black/90 text-white rounded-full px-8 py-6 text-base"
                >
                  {isSubmitting ? "Completing..." : "Complete Setup"}
                  <Check className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}