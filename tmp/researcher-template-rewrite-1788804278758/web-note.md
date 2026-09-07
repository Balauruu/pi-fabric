## RFC 7538 Research Note

**Question and scope:** Assignment `rfc7538`, limited to RFC 7538’s specified behavior, not current-browser/client testing. **Status: complete.** Primary source retrieved directly: RFC 7538, Standards Track, April 2015.

### Findings

**Q1 - Status code and method semantics: supported**

RFC 7538 defines **HTTP status code 308, “Permanent Redirect.”** It indicates that the target resource has a new permanent URI and that future references ought to use an enclosed new URI. The server **SHOULD** send a `Location` header with a preferred new URI; a user agent **MAY** use that value for automatic redirection. A 308 response is cacheable by default, subject to method definition or explicit cache controls.  
[Primary source, §3](https://www.rfc-editor.org/rfc/rfc7538.txt)

Its method-preservation distinction is specifically that 308 is like 301 **except that it “does not allow changing the request method from POST to GET.”** The introduction positions 308 as the permanent counterpart to 307: the permanent redirect category that does not permit that POST-to-GET change.  
[Primary source, §§1 and 3](https://www.rfc-editor.org/rfc/rfc7538.txt)

**Q2 - Why identical handling by every existing client cannot be concluded: supported**

RFC 7538 explicitly warns that recipients of an **unknown 3xx** status code are required by RFC 7231 to treat it like **300 (Multiple Choices)**. Consequently, servers “will not be able to rely on automatic redirection” occurring as it does for 301, 302, or 307. The RFC restricts 308 deployment to cases where the server has sufficient confidence that the client understands the new code, or where fallback-to-300 semantics are acceptable.  
[Primary source, §4](https://www.rfc-editor.org/rfc/rfc7538.txt)

This is the limiting qualification: the specification defines 308 semantics, but does not establish universal pre-existing implementation support or guarantee automatic following behavior. Further, even for a recognizing user agent, automatic use of `Location` is stated as **MAY**, not MUST.  
[Primary source, §3](https://www.rfc-editor.org/rfc/rfc7538.txt)

### Analysis

The decisive distinction is between **protocol meaning** and **deployment behavior**. RFC 7538 assigns a permanent-redirect meaning and rules out POST-to-GET rewriting for 308, but its deployment section acknowledges that unknown-code handling can instead yield 300-style behavior. Therefore, it would be unsupported to infer identical behavior across every existing HTTP client from the RFC alone.

### Counterevidence and limitations

- RFC 7538 notes that many existing HTML-based user agents emulate an HTML `<meta>` refresh and presents this as a possible fallback. This is not a claim that all clients recognize or automatically follow 308. [§4](https://www.rfc-editor.org/rfc/rfc7538.txt)
- No browser or client survey was performed, by assignment scope. Thus, current implementation prevalence and behavior are **unknown here**, not negative findings.
- The RFC’s explicit method wording is POST-to-GET; this note does not broaden it into unsupported claims about every conceivable method transformation.

### Sources and inspected support

- **Original source:** [RFC 7538 plain text](https://www.rfc-editor.org/rfc/rfc7538.txt), retrieved successfully, HTTP 200, 11,189 bytes, 340 lines.
- **Decisive locators:** §1 (redirect-category table and rationale), §3 (308 definition, `Location`, caching, POST-to-GET qualification), §4 (unknown-3xx/300 fallback and deployment limitation).

### Coverage and gaps

- **Q1:** **Supported** - 308 Permanent Redirect; permanent relocation; no POST-to-GET change.
- **Q2:** **Supported** - unknown-3xx fallback to 300 and optional automatic redirect prevent a universal identical-handling conclusion.
- **Smallest useful next check:** none for this RFC-bounded assignment; a separate client-conformance survey would be required for current implementation claims.
- **Stop reason:** requested primary-source coverage completed.