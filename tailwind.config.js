/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    green: '#2E7D32',
                    orange: '#F57C00',
                    dark: '#1B5E20',
                }
            }
        },
    },
    plugins: [],
}
