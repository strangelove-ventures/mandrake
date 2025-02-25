# Documentation Workflow Checklist

## For Each Package (Create a separate conversation for each)

1. **Initial Assessment**
   - [ ] Run `read_multiple_files` on key source files:
     - [ ] `src/index.ts` (entry point)
     - [ ] Main implementation files
     - [ ] Type definitions
     - [ ] Integration tests
   - [ ] Identify core abstractions and interfaces
   - [ ] Note dependencies on other packages

2. **Questions to Answer**
   - [ ] What is the primary purpose of this package?
   - [ ] What key problems does it solve?
   - [ ] How does it integrate with other parts of Mandrake?
   - [ ] What are the main usage patterns?
   - [ ] Are there any non-obvious design decisions to explain?

3. **README Generation**
   - [ ] Complete the Overview section
   - [ ] Document Core Concepts
   - [ ] Describe Architecture
   - [ ] Provide Usage examples from tests
   - [ ] Document Key Interfaces
   - [ ] Explain Integration Points

4. **Review and Update**
   - [ ] Compare with implementation plan to identify changes
   - [ ] Update documentation to reflect current implementation

## System Prompt Update (Final Conversation)

1. **Assessment**
   - [ ] Review all completed package READMEs
   - [ ] Compare current implementation with original design

2. **DESIGN.md Generation**
   - [ ] Update architecture overview
   - [ ] Document current component relationships
   - [ ] Explain any architectural changes from original plan

3. **System Prompt Update**
   - [ ] Revise system prompt to reflect current architecture
   - [ ] Update terminology and concepts
   - [ ] Enhance with examples from implementation
