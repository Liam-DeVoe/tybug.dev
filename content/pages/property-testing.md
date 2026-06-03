---
title: Property-based testing
slug: property-testing
page_css_class: pbt
---

A curated list of property-based testing resources.

This list is intended as a "seminal overview". If one were to read every linked resource, they would be a well-rounded property-based testing expert, with knowledge of all the important ideas.

<div class="pbt__contents">
<a href="#libraries">Libraries</a>
<a href="#posts">Posts</a>
<a href="#generation">Generation</a>
<a href="#shrinking">Shrinking</a>
<a href="#test-synthesis">Test synthesis</a>
<a href="#tools">Tools</a>
<a href="#empirical-results">Empirical results</a>
<a href="#other-lists">Other lists</a>
</div>

## Libraries

<div class="pbt-libraries">
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Python</div>
    <div class="pbt-libraries__library"><a href="https://github.com/HypothesisWorks/hypothesis">Hypothesis</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Rust</div>
    <div class="pbt-libraries__library"><a href="https://github.com/proptest-rs/proptest">proptest</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">JavaScript / TypeScript</div>
    <div class="pbt-libraries__library"><a href="https://github.com/dubzzz/fast-check">fast-check</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Go</div>
    <div class="pbt-libraries__library"><a href="https://github.com/flyingmutant/rapid">Rapid</a></div>
    <div class="pbt-libraries__library"><a href="https://github.com/leanovate/gopter">gopter</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Haskell</div>
    <div class="pbt-libraries__library"><a href="https://github.com/nick8325/quickcheck">QuickCheck</a><span class="tooltip"><span class="tooltip__trigger">note</span><span class="tooltip__body">The first recognizable PBT library. See also the paper <a href="https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf">QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs</a>.</span></span></div>
    <div class="pbt-libraries__library"><a href="https://github.com/Bodigrim/smallcheck">SmallCheck</a><span class="tooltip"><span class="tooltip__trigger">note</span><span class="tooltip__body">Exhaustively enumerates its search space, incrementally expanding in size. See also the paper <a href="https://people.irisa.fr/Thomas.Genet/ACF/Bibliography/Isabelle/Advanced/exhaustiveQuickcheck.pdf">Smallcheck and lazy smallcheck: automatic exhaustive testing for small values</a>.</span></span></div>
    <div class="pbt-libraries__library"><a href="https://github.com/hedgehogqa/haskell-hedgehog">Hedgehog</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Java</div>
    <div class="pbt-libraries__library"><a href="https://github.com/jqwik-team/jqwik">jqwik</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">C++</div>
    <div class="pbt-libraries__library"><a href="https://github.com/emil-e/rapidcheck/">RapidCheck</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">.NET</div>
    <div class="pbt-libraries__library"><a href="https://github.com/fscheck/fscheck">FsCheck</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Erlang</div>
    <div class="pbt-libraries__library"><a href="https://github.com/proper-testing/proper">PropEr</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Scala</div>
    <div class="pbt-libraries__library"><a href="https://github.com/typelevel/scalacheck">ScalaCheck</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Clojure</div>
    <div class="pbt-libraries__library"><a href="https://github.com/clojure/test.check">test.check</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Rocq</div>
    <div class="pbt-libraries__library"><a href="https://github.com/QuickChick/QuickChick">QuickChick</a></div>
  </div>
  <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Elm</div>
    <div class="pbt-libraries__library"><a href="https://github.com/elm-explorations/test">elm-test</a></div>
  </div>
  <!-- <div class="pbt-libraries__group">
    <div class="pbt-libraries__language">Elixir</div>
    <div class="pbt-libraries__library"><a href="https://github.com/alfert/propcheck">PropCheck</a><span class="tooltip"><span class="tooltip__trigger">note</span><span class="tooltip__body">Based on PropEr, an Erlang PBT library.</span></span></div>
  </div> -->
</div>

## Posts

Discussions of recurring themes in property-based testing.

- [Property-Based Testing Is Fuzzing](https://blog.nelhage.com/post/property-testing-is-fuzzing/) argues that PBT and fuzzing are two different names for the same problem.
- [Two kinds of testing](https://blog.nelhage.com/post/two-kinds-of-testing/) and its predecessor post [Property Testing like AFL](https://blog.nelhage.com/post/property-testing-like-afl/) describe some desirable UX of property-based testing tools.
- [Reducers are Fuzzers](https://blog.regehr.org/archives/1284) argues that during the course of shrinking, one is also inadvertently fuzzing.
- [Fuzzers Need Taming](https://blog.regehr.org/archives/925) describes the fuzzer taming problem: how to identify when two failing test cases are caused by the same bug?
- [What is Property Based Testing?](https://hypothesis.works/articles/what-is-property-based-testing/) gives one opinion on where property-based testing sits relative to fuzzing and other techniques.

## Tutorials

Introductory material and property-based testing tutorials.

- [Zac Hatfield-Dodds and Ryan Soklaski's An Introduction to Property-Based Testing](https://github.com/rsokl/testing-tutorial).
- [F# for Fun and Profit's Property Based Testing series](https://fsharpforfunandprofit.com/series/property-based-testing/) introduces PBT; [Choosing properties for property-based testing](https://fsharpforfunandprofit.com/posts/property-based-testing-2/) is commonly referenced.

## Generation

Can we do better than sampling test cases uniformly at random? Yes; this section discusses various techniques for doing so. Many are adjacent to, or framed as part of, the fuzzing literature.

- [Swarm Testing](https://users.cs.utah.edu/~regehr/papers/swarm12.pdf) and its corresponding blog post [Better Random Testing by Leaving Features Out](https://blog.regehr.org/archives/591) describes how randomly disabling a subset of the features in a program actually increases behavioral diversity and bug-finding power.
- [Inputs from Hell: Generating Uncommon Inputs from Common Samples](https://arxiv.org/abs/1812.07525) observes that if you have a distribution of inputs over some grammar, you can invert the observed probabilities to generate inputs along rare grammar paths.
- [Targeted Property-Based Testing](http://proper.softlab.ntua.gr/papers/issta2017.pdf) suggests that an ergonomic form of feedback to the search is to hill-climb toward increasing a developer-specified metric.

## Shrinking

Shrinking (also known as minimization or test-case reduction) takes a complex failure and shrinks it to a simpler one. This eases debugging, among other things. Shrinking is an important and sometimes overlooked part of property-based testing.

- [Everything You Ever Wanted To Know About Test-Case Reduction, But Didn’t Know to Ask](https://blog.trailofbits.com/2019/11/11/test-case-reduction/) gives an overview of shrinking and the shrinking literature.
- [Test-Case Reduction via Test-Case Generation: Insights from the Hypothesis Reducer](https://drmaciver.github.io/papers/reduction-via-generation-preview.pdf) introduces internal shrinking: instead of shrinking the test case, shrink the choices made during the generation of that test case. This internal view avoids several classical challenges of shrinking.
- [falsify: Internal Shrinking Reimagined for Haskell](https://well-typed.com/blog/aux/files/falsify.pdf) describes a Hypothesis-inspired internal shrinking algorithm that represents test cases as structured trees. See also [the blog post](https://well-typed.com/blog/2023/04/falsify/) and [the talk](https://www.youtube.com/watch?v=csKkTas6X58) by the same name.
- [C-Reduce](https://github.com/csmith-project/creduce) is a shrinker for C and C++ programs. See also the paper [Test-Case Reduction for C Compiler Bugs](https://users.cs.utah.edu/~regehr/papers/pldi12-preprint.pdf) and the blog post [Design and Evolution of C-Reduce](https://blog.regehr.org/archives/1678).
- [Shrinkray](https://github.com/DRMacIver/shrinkray) is a general-purpose shrinker that works over any file format.
- [The Shrinking Challenge](https://github.com/jlink/shrinking-challenge) compares the shrinking performance of property-based testing frameworks on a common benchmark suite.

## Test synthesis

Not satisfied with automating the generation of test cases through property-based testing, this section explores automating the process of writing property-based tests themselves.

- The [Hypothesis Ghostwriter](https://hypothesis.readthedocs.io/en/latest/reference/integrations.html#ghostwriter) generates a starting point for property-based tests using good old fashed heuristics. See also [this in-browser demo](https://zhd.dev/ghostwriter/).
- [A Claude Code command for Hypothesis](https://hypothesis.works/articles/claude-code-plugin/) and the related paper [Finding bugs across the Python ecosystem with Claude and property-based testing](https://red.anthropic.com/2026/property-based-testing/) automatically infers property-based tests and generators using AI.

## Tools

- [Hegel](https://hegel.dev/) is a family of PBT libraries built on a shared Hypothesis backend.
- [Bombadil](https://github.com/antithesishq/bombadil) is a property-based testing library for web UIs and TUIs.
- [Tyche](https://github.com/tyche-pbt/tyche-extension) is an observability tool for property-based testing. See also the paper [Tyche: Making Sense of Property-Based Testing Effectiveness](https://harrisongoldste.in/papers/uist24-tyche.pdf) and the [OpenPBTStats specification](https://hypothesis.readthedocs.io/en/latest/reference/integrations.html#observability).
- [Schemathesis](https://github.com/schemathesis/schemathesis) is a property-based testing library for OpenAPI specs. See also the paper [Deriving Semantics-Aware Fuzzers from Web API Schemas](https://arxiv.org/pdf/2112.10328).
- [hypothesis-crosshair](https://github.com/pschanely/hypothesis-crosshair) is a concolic execution[^1] backend for Hypothesis, built on [Crosshair](https://github.com/pschanely/crosshair).
<!-- - [HypoFuzz](https://github.com/Zac-HD/hypofuzz). Coverage-guided PBT for Hypothesis tests. -->
<!-- - [DeepState](https://github.com/trailofbits/deepstate) is a framework for declaring C and C++ tests that can be run under multiple backends -->
<!-- - [propverify](https://project-oak.github.io/rust-verification-tools/using-propverify/) -->
<!-- - [propfuzz](https://github.com/facebookarchive/propfuzz) -->

[^1]: Symbolic and concolic execution tools interpret code executions as an SMT statement, then use an SMT solver to synthesize powerful new test cases.

## Empirical results

Datasets and research on how developers practically interact with property-based testing.

- [Property-Based Testing in Practice](https://harrisongoldste.in/papers/icse24-pbt-in-practice.pdf) reports qualitative results from interviews of Jane Street developers who use PBT.
- [The Hypothesis Corpus](https://hypothesis.works/articles/hypothesis-corpus/) is a dataset of Hypothesis tests and runtime behavior from open-souce repositories.
- [RealPBT](https://huggingface.co/blog/maxvonhippel/realpbt) is a dataset of Hypothesis and fast-check tests.

## Other lists

Want to read more? Here are some additional lists of resources.

- [Jan Midtgaard's PBT framework list](https://github.com/jmid/pbt-frameworks) contrasts various PBT frameworks.
- [HypoFuzz's literature review](https://hypofuzz.com/docs/literature.html) focuses more on fuzzing, but may still be valuable.
