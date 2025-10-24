/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './**/*.{js,ts,jsx,tsx,mdx}', // 👈 add this catch-all line
  ],
  safelist: [
    // brand colors + states
    "bg-yellow-600","hover:bg-yellow-700","text-yellow-700",
    // common layout tokens we rely on
    "rounded-full","rounded-xl","shadow-sm",
    "border","border-gray-100","border-gray-300",
    "grid","md:grid-cols-2","gap-8",
    "flex","items-center","justify-between","space-y-6","p-8","px-5","py-2.5",
  ],
  theme: { extend: {} },
  plugins: [],
};
