Thanks for being interested in contributing to Rockpool!

# Reporting a bug

If you have found a bug (something that is broken, throws an error message, or seems to behave weirdly) **please file a bug report** by clicking _New Issue_ in [Issues](https://github.com/hughrun/rockpool/issues). Bug reports are super useful! Use the _Bug Report_ template and provide as much information as possible.

# Reporting missing, confusing or misleading documentation

This is a common and annoying problem in open source software. The goal is for Rockpool to be easy to install and use, with great documentation.

If you're not sure what the documentation should say, but think there's a problem, log an [issue](https://github.com/hughrun/rockpool/issues) using the _Documentation_ template.
If you would like to contribute by improving the documentation, please also log an issue but indicate in the issue that you're happy to update it. We can have a chat about the easiest way for you to do that, which may end up as a pull request or something else, depending on what suits your workflow.

# Suggesting a new feature

Got an idea for a cool feature? Log a new [issue](https://github.com/hughrun/rockpool/issues) using the _Feature Request_ template.

# Pull requests

Please do _not_ make pull requests without having logged an issue and had a conversation about it first. Random pull requests are very unlikely to be merged.

# Tests

All code with new features **must** include relevant new tests against those features, and all changed code must be run against the existing test suite and pass.

This project is tested using [mocha](https://github.com/mochajs/mocha).

If you're not sure how to write tests in mocha, have a chat with [Hugh](https://github.com/hughrun) about it amd he'll give you a hand or might even write them for you.

Rockpool uses a single `settings.json` file for all environments, following the [Twelve-factor app principles for configs](https://12factor.net/config). This becomes important when running tests because there are currently four specific config values that must be correct for the tests to work:

1. `blog_categories` must be set to `["galleries", "libraries", "archives", "museums", "digital humanities", "GLAM"]`
2. `use_twitter` must be set to `true`
3. `use_mastodon` must be set to `true`
4. `deliver_tokens_by` must be set to `clipboard`

All other values in your `settings.json` file can be set to any sensible value and tests should still work. To run tests should be as simple as running this command from the root of your project directory:

```
npm run test
```

The current test suite is not really world's best practice so if you're a mocha wizard feel free to send a pull request with improvements to the existing test suite.