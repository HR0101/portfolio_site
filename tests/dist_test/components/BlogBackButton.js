"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BlogBackButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const navigation_1 = require("next/navigation");
function BlogBackButton() {
    const router = (0, navigation_1.useRouter)();
    return ((0, jsx_runtime_1.jsx)("button", { id: "blog-back-btn", "data-testid": "blog-back-btn", onClick: () => router.push('/'), className: "inline-block mb-6 text-indigo-600 dark:text-indigo-400 hover:underline", children: "\u2190 Back to Blog" }));
}
