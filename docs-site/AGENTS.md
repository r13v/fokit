# Fokit Docs Site

- Keep English and Russian lesson sets in parity unless the maintainer resolves
  the launch scope differently.
- Use hash routes such as `#/en/overview` and `#/ru/overview` so the site works
  as a static GitHub Pages project without server rewrites.
- The interactive lab must use Fokit's built public package exports, not source
  imports or mocked APIs.
- Do not add an OpenAI Sites worker, `.openai/hosting.json`, redirects, a custom
  domain, analytics, or a server runtime.
- Full copyable programs live in the root `examples/` directory. The docs site
  imports those files as raw text instead of duplicating complete examples.
