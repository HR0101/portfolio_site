"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = generateStaticParams;
exports.default = BlogDetailPage;
const jsx_runtime_1 = require("react/jsx-runtime");
/* eslint-disable react-refresh/only-export-components */
const blogService_1 = require("../../../services/blogService");
const BlogBackButton_1 = __importDefault(require("../../../components/BlogBackButton"));
const navigation_1 = require("next/navigation");
function generateStaticParams() {
    return blogService_1.staticBlogs.map((post) => ({
        id: post.id,
    }));
}
function BlogDetailPage({ params }) {
    const post = blogService_1.staticBlogs.find((item) => item.id === params.id);
    if (!post) {
        (0, navigation_1.notFound)();
    }
    const htmlContent = (0, blogService_1.renderMarkdown)(post.content);
    return ((0, jsx_runtime_1.jsx)("section", { className: "py-20 px-6 max-w-4xl mx-auto", children: (0, jsx_runtime_1.jsxs)("div", { className: "blog-post-detail", "data-testid": "blog-post-detail", children: [(0, jsx_runtime_1.jsx)(BlogBackButton_1.default, {}), (0, jsx_runtime_1.jsx)("h2", { className: "blog-detail-title text-3xl font-bold text-gray-900 dark:text-white mb-4", "data-testid": "blog-detail-title", children: post.title }), (0, jsx_runtime_1.jsx)("span", { className: "blog-date text-gray-500 dark:text-gray-400 block mb-6", children: post.date }), (0, jsx_runtime_1.jsx)("div", { className: "blog-content prose dark:prose-invert max-w-none mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg", "data-testid": "blog-content", dangerouslySetInnerHTML: { __html: htmlContent } })] }) }));
}
