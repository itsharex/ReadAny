<p align="center">
  <img src="packages/app/public/logo.svg" alt="ReadAny Logo" width="120" height="120">
</p>

<h1 align="center">ReadAny</h1>

<p align="center">
  <strong>Read Any, Understand More</strong>
</p>

<p align="center">
  <em>"Why do I forget what I read? Why are my notes scattered? Why can I only search by keywords?"</em>
</p>

<p align="center">
  An AI-powered e-book reader with semantic search, intelligent chat, and knowledge management
</p>

<p align="center">
  <a href="https://github.com/codedogQBY/ReadAny/releases/latest">
    <img src="https://img.shields.io/github/v/release/codedogQBY/ReadAny?color=blue&label=Download" alt="Release">
  </a>
  <a href="https://github.com/codedogQBY/ReadAny/stargazers">
    <img src="https://img.shields.io/github/stars/codedogQBY/ReadAny?color=yellow" alt="Stars">
  </a>
  <a href="https://github.com/codedogQBY/ReadAny/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/codedogQBY/ReadAny?color=green" alt="License">
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platform">
  <a href="README_CN.md">
    <img src="https://img.shields.io/badge/lang-中文-red" alt="Chinese">
  </a>
</p>

---

<!-- TODO: Add your hero screenshot or GIF here -->
<!--
<p align="center">
  <img src="docs/screenshots/hero.gif" alt="ReadAny Demo" width="100%">
</p>
-->

## Why ReadAny?

| Problem | Traditional Readers | ReadAny |
|---------|---------------------|---------|
| Search content | Keywords only | **Semantic search** that understands your intent |
| Ask questions | Find answers yourself | **AI answers directly + locates sources** |
| Take notes | Manual copy-paste | **Select to highlight**, one-click export |
| Knowledge management | Scattered notes | **Unified management**, multi-format export |
| Privacy | Upload to cloud | **Local vector store**, fully offline capable |

### Comparison with Alternatives

| Feature | ReadAny | Calibre | KOReader | Apple Books |
|---------|---------|---------|----------|-------------|
| AI Chat | ✅ | ❌ | ❌ | ❌ |
| Semantic Search (RAG) | ✅ | ❌ | ❌ | ❌ |
| Local Vector Store | ✅ | - | - | ❌ |
| Format Support | 8+ | 15+ | 10+ | 2 |
| Note Export | 5 formats | Limited | Limited | Limited |
| Open Source | ✅ | ✅ | ✅ | ❌ |

---

## Screenshots

<div align="center">
  <img src="docs/screenshots/library.png" width="45%" alt="Library">
  <img src="docs/screenshots/reader.png" width="45%" alt="Reader">
</div>

<div align="center">
  <img src="docs/screenshots/chat.png" width="45%" alt="AI Chat">
  <img src="docs/screenshots/notes.png" width="45%" alt="Notes">
</div>

<p align="center">
  <sub>📚 Library | 📖 Reader | 🤖 AI Chat | 📝 Notes</sub>
</p>

---

## Core Features

### 🤖 AI-Powered Reading

- **Intelligent Chat** - Ask questions about your books, AI knows your position, selected text, and highlights
- **Semantic Search** - Beyond keywords, vector retrieval + BM25 hybrid search
- **Instant Translation** - AI translation or DeepL, 19 languages supported
- **Multiple AI Providers** - OpenAI, Claude, Gemini, Ollama, DeepSeek

### 📝 Annotation & Knowledge Management

- **5-Color Highlights** - Yellow/Green/Blue/Pink/Purple, hover to preview notes
- **Markdown Notes** - TipTap editor, WYSIWYG
- **Multi-format Export** - Markdown, HTML, JSON, Obsidian, Notion

### 📚 Multi-Format Support

**EPUB** · **PDF** · **MOBI** · **AZW** · **AZW3** · **FB2** · **FBZ** · **CBZ**

### 🎨 Customizable Experience

- 5 font themes (CJK optimized)
- Light/Dark mode
- Paginated/Continuous scroll
- Keyboard shortcuts
- English/Chinese interface

---

## Quick Start

### Download

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [Download .dmg](https://github.com/codedogQBY/ReadAny/releases/latest) |
| macOS (Intel) | [Download .dmg](https://github.com/codedogQBY/ReadAny/releases/latest) |
| Windows | [Download .msi](https://github.com/codedogQBY/ReadAny/releases/latest) |
| Linux | [Download .AppImage](https://github.com/codedogQBY/ReadAny/releases/latest) |

### 3 Steps to Get Started

1. **Import Books** - Drag and drop files into library
2. **Start Reading** - Double-click to open, immersive experience
3. **Configure AI** (Optional) - Settings → AI → Enter API Key

### AI Configuration

| Provider | Get API Key |
|----------|-------------|
| OpenAI | [platform.openai.com](https://platform.openai.com/) |
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com/) |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com/) |
| Ollama / DeepSeek | Local or custom endpoint |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | [React 19](https://react.dev/) + TypeScript |
| Build | [Vite 7](https://vite.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Database | SQLite |
| E-Book | [foliate-js](https://github.com/johnfactotum/foliate-js) |
| AI/LLM | [LangChain.js](https://js.langchain.com/) + [LangGraph](https://langchain-ai.github.io/langgraphjs/) |
| Embeddings | [Transformers.js](https://huggingface.co/docs/transformers.js) |

---

## Development

```bash
# Clone
git clone https://github.com/codedogQBY/ReadAny.git
cd ReadAny

# Install
pnpm install

# Dev
pnpm tauri dev

# Build
pnpm tauri build
```

**Requirements:** Node.js ≥18, pnpm ≥9, Rust

---

## Roadmap

- [ ] More AI models (Qwen, GLM, Llama)
- [ ] PDF reflow/re-render
- [ ] Cloud sync
- [ ] Mobile support
- [ ] Plugin system

---

## Contributing

Contributions welcome! Bug reports, feature requests, pull requests all appreciated.

1. Fork → 2. Branch → 3. PR

Please run `pnpm lint` before submitting to ensure code style consistency.

---

## License

[MIT](LICENSE) © 2024 ReadAny Team

---

## Acknowledgments

- [foliate-js](https://github.com/johnfactotum/foliate-js) - E-book rendering engine
- [Tauri](https://tauri.app/) - Cross-platform desktop framework
- [LangChain.js](https://js.langchain.com/) - AI orchestration framework
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components
- [Lucide](https://lucide.dev/) - Icon library

---

<p align="center">
  Made with ❤️ by the ReadAny Team
</p>

<p align="center">
  <a href="https://github.com/codedogQBY/ReadAny/discussions">💬 Discussions</a> •
  <a href="https://github.com/codedogQBY/ReadAny/issues">🐛 Issues</a>
</p>
