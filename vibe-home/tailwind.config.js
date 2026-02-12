/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vibe: {
                    blue: '#3B82F6',
                    slate: '#0F172A',
                    "slate-light": '#1E293B',
                }
            }
        },
    },
    plugins: [],
}
