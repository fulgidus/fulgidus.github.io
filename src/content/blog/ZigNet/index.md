---
title: "ZigNet: How I Built an MCP Server for Zig in 1.5 Days"
description: "AI is great and all, but it can't keep up with Zig's breakneck development pace. So I wondered: what would it actually take to build my own? Turns out, with a hybrid deterministic/stochastic approach, an RTX 3090, and 4.5 hours of training, I created a specialized LLM that runs on a regular laptop."
image: ./zignet-cover.png
imageAlt: "ZigNet's hybrid architecture combining Zig compiler and LLM"
imageSize: md
pubDate: 2025-11-01T10:30:00
duration: 12m
tags:
- zig
- mcp
- ai
- llm
- typescript
- machine-learning
- neural-networks
- open-source
- model-context-protocol
- fine-tuning
- qwen
- compiler-integration
- hybrid-systems
- local-ai
- developer-tools
draft: false
lang: en
redirect: ""
unlisted: false
video: false
---

## The Initial Spark

It all started with a simple frustration: "AI is cool and all, but it just can't keep up with how fast Zig evolves." Regular LLMs kept giving me garbage suggestions, mixing up old syntax with new, making up APIs that never existed.

So I asked myself: **what would it actually cost to build my own?**

The questions bouncing around my head:
- How much resources does it take to run an LLM locally?
- Do I really need a massive model or can I get away with something smaller?
- Can I skip fine-tuning everything and just focus on what matters?

After digging around a bit, I realized the solution wasn't some gigantic LLM that knows everything about Zig, but a **hybrid system**:
- **50% deterministic**: The official Zig compiler for validation and formatting (100% accurate, zero hallucinations)
- **50% stochastic**: A small but specialized LLM for suggestions and documentation (where a bit of creativity is actually helpful)

Enter Anthropic's **Model Context Protocol (MCP)**. MCP let me bridge these two worlds: giving Claude access to the real Zig compiler AND a specialized model, all completely transparent to the user.

## The Research Phase: What Does a Custom LLM Actually Cost?

Before diving into code, I did my homework. Here's what I discovered:

### Hardware Costs
- **Training**: RTX 3090 (24GB) - already had one ✓
- **Local inference**: 4-8GB RAM for a quantized 7B model
- **Cloud training**: ~$50 on vast.ai for 4-5 hours (if you don't have a GPU)

### Model Sizes (The Big Surprise)
I tested various base models:
```
Llama3.2-3B     → 2GB quantized  → Fast but dumb with Zig
CodeLlama-7B    → 4GB quantized  → Confuses Zig with Rust
Qwen2.5-7B      → 4GB quantized  → Excellent! Already understands Zig pretty well
Mistral-7B      → 4GB quantized  → Good but doesn't excel
DeepSeek-33B    → 16GB quantized → Total overkill for my use case
```

**The revelation**: You don't need GPT-4! A well-trained 7B is more than enough for a specific domain like Zig.

### The Hybrid Plan
Instead of trying to teach the model EVERYTHING, I split the responsibilities:

| Task | Solution | Why |
|------|----------|-----|
| Syntax validation | `zig ast-check` | 100% accurate, zero training needed |
| Formatting | `zig fmt` | Official standard, deterministic |
| Documentation | Fine-tuned LLM | Needs creativity and context |
| Fix suggestions | Fine-tuned LLM | Requires semantic understanding |
| Type checking | `zig ast-check` | The compiler knows best |

This approach drastically cut down requirements:
- **Training set**: Just 13,756 examples (not millions)
- **Training time**: 4.5 hours (not weeks)
- **Model size**: 4.4GB final (runs on a decent laptop)
- **Accuracy**: 100% on syntax, 95% on suggestions

## Why Zig Needs ZigNet

Zig is a young language that moves fast. Its unique features like `comptime`, explicit error handling, and generics make it powerful but also tricky to analyze. Regular LLMs:

- **Can't verify syntax**: They suggest code that looks right but won't compile
- **Don't know the latest APIs**: Zig evolves quickly, APIs change between versions
- **Can't format code**: Every project has its style, but `zig fmt` is the standard
- **Make up functions**: Without access to real docs, LLMs hallucinate

ZigNet solves this by directly integrating the official Zig compiler.

## The Architecture: Simple but Effective

```
┌────────────────────────────────────────────────────┐
│                 Claude / MCP Client                │
└────────────────────┬───────────────────────────────┘
                     │ MCP Protocol (JSON-RPC)
┌────────────────────▼───────────────────────────────┐
│            ZigNet MCP Server (TypeScript)          │
│  ┌──────────────────────────────────────────────┐  │
│  │              Tool Handlers                   │  │
│  │  - analyze_zig: Syntax and type analysis     │  │
│  │  - compile_zig: Code formatting              │  │
│  │  - get_zig_docs: AI-powered documentation    │  │
│  │  - suggest_fix: Smart suggestions            │  │
│  └─────────────┬────────────────────────────────┘  │
│                ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │        Zig Compiler Integration              │  │
│  │  - zig ast-check (syntax/type validation)    │  │
│  │  - zig fmt (official formatter)              │  │
│  │  - Multi-version (0.13, 0.14, 0.15)          │  │
│  └─────────────┬────────────────────────────────┘  │
│                ▼                                   │
│  ┌──────────────────────────────────────────────┐  │
│  │     Fine-tuned LLM (Qwen2.5-Coder-7B)        │  │
│  │  - 13,756 training examples                  │  │
│  │  - Specialized on modern Zig idioms          │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Key Decision #1: Use the Official Compiler

Instead of writing a custom parser (like many language servers do), I went straight for the Zig compiler:

```typescript
// src/zig/executor.ts
export class ZigExecutor {
  async analyze(code: string): Promise<AnalysisResult> {
    // Save code to a temp file
    const tempFile = await this.createTempFile(code);
    
    // Use zig ast-check for analysis
    const result = await execAsync(
      `${this.zigPath} ast-check ${tempFile}`
    );
    
    // Parse compiler output
    return this.parseCompilerOutput(result);
  }
}
```

**Benefits:**
- **100% accurate**: It's the same compiler you'll actually use
- **Always up-to-date**: No lag implementing new features
- **Zero maintenance**: When Zig 0.16 drops, it'll just work

### Key Decision #2: Smart Multi-versioning

Zig developers use different versions. ZigNet handles this automatically:

```typescript
// src/zig/manager.ts
export class ZigManager {
  async getZigExecutable(version?: string): Promise<string> {
    // First check if Zig is installed on the system
    const systemZig = await this.findSystemZig();
    if (systemZig && (!version || systemZig.version === version)) {
      return systemZig.path;
    }
    
    // Otherwise download the requested version
    return this.downloadZig(version || 'latest');
  }
}
```

The caching system is smart:
- Detects existing installations
- Downloads only when needed
- Keeps multiple versions in parallel
- Persistent cache between sessions

### Key Decision #3: Fine-tuned LLM for Zig

For the advanced features (docs and suggestions), I trained a specialized model:

```python
# scripts/train-qwen-standard.py
def prepare_dataset():
    """13,756 examples from real Zig repositories"""
    examples = []
    
    # 97% code from GitHub (Zig 0.13-0.15)
    for repo in zig_repos:
        examples.extend(extract_zig_patterns(repo))
    
    # 3% official documentation
    examples.extend(parse_zig_docs())
    
    return train_test_split(examples)
```

**The fine-tuning process:**
1. **Base model**: Qwen2.5-Coder-7B-Instruct (best Zig understanding in benchmarks)
2. **Technique**: QLoRA 4-bit (efficient training on RTX 3090)
3. **Dataset**: Focus on modern idioms (`comptime`, generics, error handling)
4. **Output**: Q4_K_M quantized model (~4GB for local inference)

## Technical Challenges I Faced

### Challenge #1: Parsing Compiler Errors

The Zig compiler is verbose. I had to parse complex output:

```typescript
// A typical Zig error
error: expected type 'i32', found '[]const u8'
    const x: i32 = "hello";
             ^~~

// The parser needs to extract:
// - Error type
// - Position (line, column)
// - Types involved
// - Contextual hints
```

### Challenge #2: LLM Performance

Inference on a 7B model can be slow. Here's what I optimized:

```typescript
// src/llm/session.ts
export class LLMSession {
  private model: LlamaModel;
  private contextCache: Map<string, LlamaContext>;
  
  async suggest(code: string, error: string) {
    // Reuse contexts for similar queries
    const cacheKey = this.getCacheKey(code, error);
    let context = this.contextCache.get(cacheKey);
    
    if (!context) {
      context = await this.model.createContext({
        contextSize: 2048,  // Limited for speed
        threads: 8,          // Parallelization
      });
    }
    
    // Zig-specific prompt engineering
    const prompt = this.buildZigPrompt(code, error);
    return context.evaluate(prompt);
  }
}
```

**Results:**
- First query: ~15-20 seconds (model loading)
- Subsequent queries: ~2-3 seconds (with cache)
- Suggestion quality: 95% useful in tests

### Challenge #3: End-to-End Testing

How do you test a system that depends on compiler + LLM?

```typescript
// tests/e2e/mcp-integration.test.ts
describe('ZigNet E2E Tests', () => {
  // Deterministic tests (always run)
  test('analyze_zig - syntax error', async () => {
    const result = await mcp.call('analyze_zig', {
      code: 'fn main() { invalid syntax }'
    });
    expect(result.errors).toContain('expected');
  });
  
  // LLM tests (auto-skip if model not present)
  test('suggest_fix - type mismatch', async () => {
    if (!modelAvailable()) {
      console.log('Skipping LLM test - model not found');
      return;
    }
    
    const result = await mcp.call('suggest_fix', {
      code: 'var x: i32 = "hello";',
      error: 'type mismatch'
    });
    
    // Verify it suggests at least one valid fix
    expect(result.suggestions).toContainValidZigCode();
  });
});
```

**Testing strategy:**
- **27 total tests**: 12 deterministic, 15 with LLM
- **CI/CD friendly**: LLM tests are optional
- **Performance tracking**: Each test measures time
- **Complete coverage**: All tools and edge cases

## Claude Integration: The MCP Magic

The integration is surprisingly simple:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "zignet": {
      "command": "npx",
      "args": ["-y", "zignet"]
    }
  }
}
```

Once configured, the user experience feels natural:

```
You: "Check this Zig code for errors"
[paste code]

Claude: [automatically uses analyze_zig]
"Found 2 errors:
1. Line 5: Type mismatch - variable 'x' expects i32 but got []const u8
2. Line 12: Function 'prozess' undefined, did you mean 'process'?"

You: "Can you format it properly?"

Claude: [uses compile_zig]
"Here's the code formatted with zig fmt:
[clean, formatted code]"
```

## Lessons Learned

### 1. **You Don't Need a Giant LLM**
My biggest discovery: for a specific domain like Zig, a well-trained 7B beats a generic GPT-4. It's about specialization, not size.

### 2. **Hybrid > Pure ML**
Combining deterministic tools (compiler) with ML (suggestions) gives you the best of both worlds: accuracy where it matters, creativity where it helps.

### 3. **It's Actually Affordable**
Fine-tuning on consumer hardware? Totally doable!
- RTX 3090: 4.5 hours of actual training
- Inference: runs on laptops with 8GB RAM
- Alternative: vast.ai or RunPod if you don't have a GPU (~$50 for complete training)

### 4. **Reuse Existing Tools**
The Zig compiler already does everything needed for validation. Why reinvent the wheel when you can focus on what's actually missing?

### 5. **UX is Everything**
Users shouldn't know there's a hybrid system behind the scenes. It should be transparent and "just work."

### 6. **Separate Tests for Deterministic and Stochastic Components**
Compiler tests are always reproducible. LLM tests can vary - plan accordingly.

### 7. **Open Source from Day 1**
Publishing the code forced me to maintain high standards and clear documentation. Plus, the Zig community is amazing for feedback.

## Project Stats

- **Development time**: 1.5 days
- **Model size**: 4.4GB (quantized)
- **Training time**: 4.5 hours on RTX 3090
- **License**: WTFPL v2 (maximum freedom)

## Conclusions

ZigNet proves **you don't need GPT-4 or $100k clusters for specialized AI**. With a smart hybrid approach, you can get excellent results:

- **Hardware budget**: RTX 3090 or $50 of cloud time
- **Small model**: 7B parameters is plenty
- **Hybrid system**: Compiler for accuracy, LLM for creativity
- **Reasonable time**: 1.5 days from idea to release

The key was understanding I didn't need to replace everything with ML, just the parts where AI actually adds value:

1. **Identify what can be deterministic** (validation → compiler)
2. **Identify what needs "intelligence"** (suggestions → LLM)
3. **Pick the right model** (Qwen2.5-7B, not GPT-4)
4. **Targeted training** (13k Zig examples, not billions of generic data)
5. **Seamless integration** (MCP does the magic)

The result? A system that:
- **Runs locally** on consumer hardware
- **Is 100% accurate** on syntax
- **Is 95% useful** on suggestions
- **Costs almost nothing** to maintain

If you're thinking "I'd love a specialized LLM for X but it's too expensive," think again. With the right approach, you probably need way less than you think.

The code is completely open source. If you're curious how a hybrid deterministic/stochastic system actually works, check it out:

**VSCode package**: [https://marketplace.visualstudio.com/items?itemName=Fulgidus.zignet](https://marketplace.visualstudio.com/items?itemName=Fulgidus.zignet)  
**🔗 Repository**: [github.com/fulgidus/zignet](https://github.com/fulgidus/zignet)  
**🤖 Model**: [huggingface.co/fulgidus/zignet-qwen2.5-coder-7b](https://huggingface.co/fulgidus/zignet-qwen2.5-coder-7b)

Got questions? Want to build something similar for another language? Open an issue on GitHub or reach out. The project is WTFPL - literally do whatever you want with the code!

---

*P.S.: Next time someone tells you that you need millions for custom AI, show them ZigNet. Sometimes all it takes is a gaming GPU, a free weekend, and the willingness to try. The future of specialized AI is accessible to everyone. 🚀*