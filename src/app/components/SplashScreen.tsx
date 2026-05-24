// import { motion } from "motion/react";
// import { useEffect } from "react";
// import { Sparkles } from "lucide-react";
// import logo_img from "../../imports/logo.png";

// interface SplashScreenProps {
//   onComplete: () => void;
// }

// export function SplashScreen({ onComplete }: SplashScreenProps) {
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       onComplete();
//     }, 1500); // Short — returning users skip splash entirely
//     return () => clearTimeout(timer);
//   }, [onComplete]);


//   return (
//     <div className="fixed inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2a4a6f] to-[#1e3a5f] flex flex-col items-center justify-center overflow-hidden">
//       {/* Animated Background */}
//       <div className="absolute inset-0">
//         <motion.div
//           animate={{
//             scale: [1, 1.5, 1],
//             opacity: [0.3, 0.5, 0.3],
//           }}
//           transition={{ duration: 3, repeat: Infinity }}
//           className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
//         />
//         <motion.div
//           animate={{
//             scale: [1.5, 1, 1.5],
//             opacity: [0.5, 0.3, 0.5],
//           }}
//           transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
//           className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
//         />
//       </div>

//       {/* Content */}
//       <motion.div
//         initial={{ opacity: 0, scale: 0.5 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ duration: 0.8, ease: "easeOut" }}
//         className="text-center relative z-10"
//       >
//         <motion.div
//           initial={{ y: 20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ delay: 0.3, duration: 0.6 }}
//           className="mb-8"
//         >
//         <div className="relative inline-block bg-white p-4 rounded-3xl shadow-lg">
//             <img
//               src={logo_img}
//               alt="Legal Docs Maker"
//               className="w-48 h-auto mx-auto drop-shadow-md object-contain"
              
//             />
//           </div>
//             <motion.div
//               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
//               transition={{ duration: 2, repeat: Infinity }}
//               className="absolute -inset-4 bg-white/20 rounded-full blur-xl -z-10"
//             />
//           </div>

//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.6, duration: 0.6 }}
//         >
//           <h1 className="text-white text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
//             <Sparkles className="w-6 h-6 text-amber-300" />
//             <span>Legal Docs Maker</span>
//             <Sparkles className="w-6 h-6 text-amber-300" />
//           </h1>
//           <p className="text-blue-100 text-lg font-medium">
//             Draft Smart. Draft Legal.
//           </p>
//           <p className="text-blue-200 text-base mt-1">
//             स्मार्ट ड्राफ्ट करें। कानूनी ड्राफ्ट करें।
//           </p>
//         </motion.div>

//         {/* Loading Indicator */}
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1, duration: 0.5 }}
//           className="mt-12 flex justify-center gap-2"
//         >
//           {[0, 1, 2].map((i) => (
//             <motion.div
//               key={i}
//               animate={{
//                 scale: [1, 1.5, 1],
//                 opacity: [0.3, 1, 0.3],
//               }}
//               transition={{
//                 duration: 1,
//                 repeat: Infinity,
//                 delay: i * 0.2,
//               }}
//               className="w-3 h-3 bg-white rounded-full"
//             />
//           ))}
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }


import { motion } from "motion/react";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500); // Short — returning users skip splash entirely
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2a4a6f] to-[#1e3a5f] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.5, 1, 1.5],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center relative z-10"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8 relative"
        >
          {/* 👇 ROBUST LOGO WITH WHITE BACKGROUND COMPONENT */}
          <div className="relative inline-block bg-white p-4 rounded-3xl shadow-lg z-10">
            <img
              src="/src/imports/logo.png"
              alt="Legal Docs Maker"
              className="w-48 h-auto mx-auto drop-shadow-md object-contain"
            />
          </div>

          {/* Background Glow Effect Behind Logo */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-4 bg-white/20 rounded-full blur-xl -z-10"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h1 className="text-white text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-300" />
            <span>Legal Docs Maker</span>
            <Sparkles className="w-6 h-6 text-amber-300" />
          </h1>
          <p className="text-blue-100 text-lg font-medium">
            Draft Smart. Draft Legal.
          </p>
          <p className="text-blue-200 text-base mt-1">
            स्मार्ट ड्राफ्ट करें। कानूनी ड्राफ्ट करें।
          </p>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-12 flex justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-white rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
