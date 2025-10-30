import asyncio
import re
import json
import urllib.parse
from typing import Dict, Any, List, Tuple
from crawl4ai import AsyncWebCrawler
from groq import Groq

class FactCheckerSystem:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile", max_links: int = 3):
        self.client = Groq(api_key=api_key)
        self.model = model
        self.max_links = max_links
        self.total_input_tokens = 0
        self.total_output_tokens = 0
    
    def clean_text(self, content: str) -> str:
        content = re.sub(r'!\[\]\([^)]+\)', '', content)
        content = re.sub(r'\[\]\([^)]+\)', '', content)
        content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
        
        content = re.sub(r'^https?://\S+$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^www\.\S+$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^[\w\s]+\.com$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\w+Dictionary$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Wikipedia$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Ancestry\.com$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Hinkhoj$', '', content, flags=re.MULTILINE)
        
        content = re.sub(r'^Show more$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^See more$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Feedback$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^People also ask$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^(Generative AI is experimental\. Learn more)$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Can\'t generate an AI overview.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^An AI Overview is not available.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^AI Overview$', '', content, flags=re.MULTILINE)
        
        content = re.sub(r'https?://[^\s]+', '', content)
        content = re.sub(r'›', '', content)
        
        paragraphs = [p.strip() for p in content.split('\n') if p.strip()]
        clean_content = '\n\n'.join(paragraphs)
        
        clean_content = re.sub(r'\n{3,}', '\n\n', clean_content)
        clean_content = re.sub(r' {2,}', ' ', clean_content)
        clean_content = clean_content.strip()
        
        return clean_content
    
    def extract_links_from_google_results(self, markdown_content: str) -> List[str]:
        """Extract relevant links from Google search results markdown"""
        links = []
        
        # Extract markdown links formatted as [text](url)
        link_pattern = r'\[(?:[^\]]+)\]\((https?://[^()]+)\)'
        matches = re.findall(link_pattern, markdown_content)
        
        for url in matches:
            # Decode URL if needed
            url = urllib.parse.unquote(url)
            
            # Skip Google-specific URLs and other non-content sites
            if any(domain in url for domain in [
                'google.com', 'youtube.com/watch', 'accounts.google', 'support.google',
                'maps.google', 'play.google', 'policies.google', 'consent.google',
                'books.google', 'translate.google'
            ]):
                continue
            
            # Exclude links that are images, PDFs, or other non-text file formats
            excluded_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.svg', 
                                '.webp', '.pdf', '.docx', '.xlsx', '.pptx', '.zip')
            if url.lower().endswith(excluded_extensions):
                continue
            
            links.append(url)
        
        # Return unique links up to max_links
        unique_links = []
        for link in links:
            if link not in unique_links:
                unique_links.append(link)
            if len(unique_links) >= self.max_links:
                break
                
        return unique_links

    def generate_search_queries(self, statement: str) -> List[str]:
        """Generate multiple targeted search queries for better fact-checking"""
        base_statement = statement.strip()
        
        queries = [
            f'"{base_statement}" fact check',  # Exact phrase with fact check
            f'{base_statement} true or false',  # Direct truth inquiry
            f'{base_statement} verified',  # Look for verification
            f'{base_statement} debunked myth',  # Check if it's debunked
            f'{base_statement} Reuters fact check',  # Reuters specific
            f'{base_statement} AP news fact check',  # AP specific
            f'{base_statement} Snopes',  # Snopes specific
            f'is it true that {base_statement}',  # Natural language query
        ]
        
        return queries

    def get_trusted_sources(self) -> List[str]:
        """Return list of trusted fact-checking and news sources"""
        return [
            'factcheck.org',
            'snopes.com', 
            'politifact.com',
            'reuters.com',
            'apnews.com',
            'bbc.com',
            'npr.org',
            'washingtonpost.com',
            'nytimes.com',
            'cnn.com',
            'nbcnews.com',
            'cbsnews.com',
            'abcnews.go.com',
            'usatoday.com',
            'wsj.com',
            'theguardian.com',
            'pbs.org',
            'time.com',
            'newsweek.com',
            'theatlantic.com'
        ]

    def extract_links_from_duckduckgo(self, markdown_content: str) -> List[str]:
        """Extract relevant links from DuckDuckGo search results markdown"""
        links = []
        trusted_sources = self.get_trusted_sources()
        
        print(f"DuckDuckGo content length: {len(markdown_content)}")
        print(f"DuckDuckGo content preview: {markdown_content[:300]}...")
        
        # Try multiple patterns to extract links
        patterns = [
            r'\[(?:[^\]]+)\]\((https?://[^()]+)\)',  # Standard markdown links
            r'(https?://[^\s\)\],]+)',  # Plain URLs (improved)
            r'href=["\']?(https?://[^"\'\s>]+)',  # HTML href attributes
        ]
        
        all_found_urls = []
        for pattern in patterns:
            matches = re.findall(pattern, markdown_content, re.IGNORECASE)
            all_found_urls.extend(matches)
            print(f"Pattern '{pattern}' found {len(matches)} URLs")
        
        print(f"Total URLs found before filtering: {len(all_found_urls)}")
        
        for url in all_found_urls:
            # Decode URL if needed
            try:
                url = urllib.parse.unquote(url)
            except:
                continue
                
            # Skip DuckDuckGo-specific URLs and other non-content sites
            if any(domain in url.lower() for domain in [
                'duckduckgo.com', 'youtube.com/watch', 'accounts.', 'support.',
                'maps.', 'play.', 'policies.', 'consent.',
                'books.', 'translate.', 'wikipedia.org', 'facebook.com', 
                'twitter.com', 'instagram.com', 'linkedin.com'
            ]):
                continue
            
            # Exclude links that are images, PDFs, or other non-text file formats
            excluded_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.svg', 
                                '.webp', '.pdf', '.docx', '.xlsx', '.pptx', '.zip')
            if any(url.lower().endswith(ext) for ext in excluded_extensions):
                continue
            
            # Only include trusted sources
            is_trusted = any(trusted_domain in url.lower() for trusted_domain in trusted_sources)
            if not is_trusted:
                continue
                
            # Valid URL that passed all filters
            links.append(url)
        
        # Return unique links up to max_links
        unique_links = []
        for link in links:
            if link not in unique_links and link.startswith('http'):
                unique_links.append(link)
            if len(unique_links) >= self.max_links:
                break
        
        print(f"DuckDuckGo extracted trusted links: {unique_links}")
        return unique_links

    def extract_links_from_bing(self, markdown_content: str) -> List[str]:
        """Extract relevant links from Bing search results markdown"""
        links = []
        trusted_sources = self.get_trusted_sources()
        
        print(f"Bing content length: {len(markdown_content)}")
        print(f"Bing content preview: {markdown_content[:300]}...")
        
        # Try multiple patterns to extract links
        patterns = [
            r'\[(?:[^\]]+)\]\((https?://[^()]+)\)',  # Standard markdown links
            r'(https?://[^\s\)\],]+)',  # Plain URLs (improved)
            r'href=["\']?(https?://[^"\'\s>]+)',  # HTML href attributes
        ]
        
        all_found_urls = []
        for pattern in patterns:
            matches = re.findall(pattern, markdown_content, re.IGNORECASE)
            all_found_urls.extend(matches)
            print(f"Pattern '{pattern}' found {len(matches)} URLs")
        
        print(f"Total URLs found before filtering: {len(all_found_urls)}")
        
        for url in all_found_urls:
            # Decode URL if needed
            try:
                url = urllib.parse.unquote(url)
            except:
                continue
                
            # Skip Bing-specific URLs and other non-content sites
            if any(domain in url.lower() for domain in [
                'bing.com', 'microsoft.com', 'msn.com', 'youtube.com/watch', 
                'accounts.', 'support.', 'maps.', 'play.', 'policies.', 'consent.',
                'books.', 'translate.', 'wikipedia.org', 'facebook.com', 
                'twitter.com', 'instagram.com', 'linkedin.com'
            ]):
                continue
            
            # Exclude links that are images, PDFs, or other non-text file formats
            excluded_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.svg', 
                                '.webp', '.pdf', '.docx', '.xlsx', '.pptx', '.zip')
            if any(url.lower().endswith(ext) for ext in excluded_extensions):
                continue
            
            # Only include trusted sources
            is_trusted = any(trusted_domain in url.lower() for trusted_domain in trusted_sources)
            if not is_trusted:
                continue
                
            # Valid URL that passed all filters
            links.append(url)
        
        # Return unique links up to max_links
        unique_links = []
        for link in links:
            if link not in unique_links and link.startswith('http'):
                unique_links.append(link)
            if len(unique_links) >= self.max_links:
                break
        
        print(f"Bing extracted trusted links: {unique_links}")
        return unique_links

    def fact_check_with_llm(self, sources: List[Tuple[str, str]], statement: str) -> Dict[str, Any]:
        combined_text = ""
        source_urls = []
        
        for url, text in sources:
            combined_text += f"SOURCE: {url}\n{text}\n\n"
            source_urls.append(url)
            
        prompt = f"""
        Given the following statement and content from multiple web sources, verify if the statement is factually correct.
        
        STATEMENT TO VERIFY: "{statement}"
        
        CONTENT FROM VARIOUS SOURCES:
        {combined_text}
        
        Return your analysis as a JSON object with the following structure:
        {{
            "is_correct": true/false,
            "confidence": "high/medium/low",
            "explanation": "A detailed explanation of why the statement is correct or incorrect",
            "facts_found": ["relevant fact 1", "relevant fact 2", "relevant fact 3"],
            "inaccuracies": ["inaccuracy 1", "inaccuracy 2"],
            "missing_context": "Important context that might be missing from the statement",
            "sources": ["source URL 1", "source URL 2"]
        }}
        
        Rules for verification:
        1. Only mark a statement as correct if it is fully supported by the sources
        2. If the statement is partially correct, mark it as incorrect and explain which parts are correct and which are not
        3. If there isn't enough information to verify, indicate low confidence
        4. Be specific about why something is factually correct or incorrect
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a fact-checking assistant that verifies statements against reliable sources."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            # Extract token usage information
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            
            # Update the total token counts
            self.total_input_tokens += input_tokens
            self.total_output_tokens += output_tokens
            
            # Log token usage for this request
            print(f"\n--- Token Usage for this request ---")
            print(f"Input tokens: {input_tokens}")
            print(f"Output tokens: {output_tokens}")
            print(f"Total tokens: {input_tokens + output_tokens}")
            
            content = response.choices[0].message.content
            json_match = re.search(r'({[\s\S]*})', content)
            if json_match:
                content = json_match.group(1)
                
            result_data = json.loads(content)
            
            # Add token usage to the result
            result_data["token_usage"] = {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
            
            return result_data
            
        except Exception as e:
            # Fallback if parsing fails
            return {
                "is_correct": None,
                "confidence": "none",
                "explanation": f"Error occurred during fact checking: {str(e)}",
                "facts_found": [],
                "inaccuracies": ["Error processing fact check"],
                "missing_context": "Could not complete the fact check due to an error",
                "sources": source_urls,
                "token_usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0
                }
            }
    
    async def verify_statement(self, statement: str) -> Dict[str, Any]:
        # Generate targeted search queries
        search_queries = self.generate_search_queries(statement)
        trusted_sources = self.get_trusted_sources()
        
        # Create search strategies using multiple queries and engines
        search_strategies = []
        
        # Add DuckDuckGo searches with different queries
        for query in search_queries[:3]:  # Use top 3 queries
            search_strategies.append(f"https://duckduckgo.com/html/?q={query.replace(' ', '+')}")
        
        # Add Bing searches with different queries
        for query in search_queries[:2]:  # Use top 2 queries
            search_strategies.append(f"https://www.bing.com/search?q={query.replace(' ', '+')}")
        
        # Add direct searches on trusted fact-checking sites
        search_strategies.extend([
            f"https://www.snopes.com/search/{statement.replace(' ', '+')}",
            f"https://www.factcheck.org/search/?s={statement.replace(' ', '+')}",
            f"https://www.politifact.com/search/?q={statement.replace(' ', '+')}",
        ])
        
        # Add site-specific searches for trusted sources
        site_specific_queries = [
            f"site:reuters.com fact check {statement}",
            f"site:apnews.com fact check {statement}", 
            f"site:bbc.com fact check {statement}",
            f"site:npr.org {statement}",
        ]
        
        for query in site_specific_queries:
            search_strategies.append(f"https://duckduckgo.com/html/?q={query.replace(' ', '+')}")
        
        async with AsyncWebCrawler(
            verbose=True,
            # Add headers to appear more like a real browser
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            # Add delay between requests
            delay=2
        ) as crawler:
            
            all_links = []
            
            # Try different search strategies
            for i, search_url in enumerate(search_strategies):
                try:
                    print(f"Trying search strategy {i+1}: {search_url}")
                    
                    # Add progressive delay to avoid rate limiting
                    if i > 0:
                        await asyncio.sleep(min(3 + (i // 3), 10))  # Progressive delay
                    
                    search_result = await asyncio.wait_for(
                        crawler.arun(url=search_url), 
                        timeout=25
                    )
                    
                    # Extract links based on the search engine
                    current_links = []
                    if "duckduckgo.com" in search_url:
                        current_links = self.extract_links_from_duckduckgo(search_result.markdown)
                    elif "bing.com" in search_url:
                        current_links = self.extract_links_from_bing(search_result.markdown)
                    elif any(site in search_url for site in ["snopes.com", "factcheck.org", "politifact.com"]):
                        # For direct fact-checking sites, use the search page content
                        if search_result.markdown and len(search_result.markdown) > 100:
                            current_links = [search_url]
                    else:
                        # Fallback to Google-style extraction
                        current_links = self.extract_links_from_google_results(search_result.markdown)
                    
                    # Add unique links
                    for link in current_links:
                        if link not in all_links:
                            all_links.append(link)
                    
                    print(f"Strategy {i+1} found {len(current_links)} new links. Total: {len(all_links)}")
                    
                    # Stop if we have enough trusted sources
                    if len(all_links) >= self.max_links * 2:  # Get more than needed for better selection
                        break
                        
                except Exception as e:
                    print(f"Strategy {i+1} failed: {e}")
                    continue
            
            # If still no links, try direct access to trusted sources
            if not all_links:
                print("No links found from searches, trying direct access to trusted sources...")
                direct_urls = [
                    f"https://www.snopes.com/search/{statement.replace(' ', '+')}",
                    f"https://www.factcheck.org/search/?s={statement.replace(' ', '+')}",
                    f"https://www.politifact.com/search/?q={statement.replace(' ', '+')}",
                    f"https://www.reuters.com/search/news?blob={statement.replace(' ', '+')}+fact+check"
                ]
                
                for url in direct_urls:
                    try:
                        await asyncio.sleep(3)
                        result = await asyncio.wait_for(crawler.arun(url=url), timeout=25)
                        if result.markdown and len(result.markdown) > 200:
                            all_links.append(url)
                            if len(all_links) >= 2:
                                break
                    except Exception as e:
                        print(f"Failed to access {url}: {e}")
                        continue
            
            # Select best links from trusted sources
            links_to_visit = []
            trusted_priority = ['factcheck.org', 'snopes.com', 'politifact.com', 'reuters.com', 'apnews.com', 'bbc.com', 'npr.org']
            
            # First, add high-priority trusted sources
            for priority_domain in trusted_priority:
                for link in all_links:
                    if priority_domain in link.lower() and link not in links_to_visit:
                        links_to_visit.append(link)
                        if len(links_to_visit) >= self.max_links:
                            break
                if len(links_to_visit) >= self.max_links:
                    break
            
            # If still need more, add other trusted sources
            if len(links_to_visit) < self.max_links:
                for link in all_links:
                    if link not in links_to_visit and any(domain in link.lower() for domain in trusted_sources):
                        links_to_visit.append(link)
                        if len(links_to_visit) >= self.max_links:
                            break
            
            print(f"Final selection: {len(links_to_visit)} trusted sources to visit")
            
            if not links_to_visit:
                return {
                    "is_correct": None,
                    "confidence": "none",
                    "explanation": "Could not find reliable sources to verify this statement. This may indicate the statement is too specific, recent, or not widely fact-checked.",
                    "facts_found": [],
                    "inaccuracies": ["No trusted sources available for verification"],
                    "missing_context": "Unable to verify without access to reliable fact-checking sources",
                    "sources": [],
                    "token_usage": {
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "total_tokens": 0
                    }
                }
            
            # Visit each link and collect content
            sources = []
            for link in links_to_visit:
                try:
                    print(f"\n--- Visiting: {link} ---")
                    # Use a timeout to avoid getting stuck on slow sites
                    page_result = await asyncio.wait_for(crawler.arun(url=link), timeout=30)
                    clean_content = self.clean_text(page_result.markdown)
                    
                    # Print content info for debugging
                    print(f"Raw content length: {len(page_result.markdown) if page_result.markdown else 0}")
                    print(f"Clean content length: {len(clean_content)}")
                    print(f"Content preview (first 500 chars):")
                    print("-" * 50)
                    print(clean_content[:500] + "..." if len(clean_content) > 500 else clean_content)
                    print("-" * 50)
                    
                    if len(clean_content) > 100:  # Only include if we got meaningful content
                        sources.append((link, clean_content))
                        print(f"✓ Successfully extracted content from {link}")
                    else:
                        print(f"⚠ Content too short from {link}, skipping")
                        
                except Exception as e:
                    print(f"✗ Error visiting {link}: {e}")
            
            if not sources:
                return {
                    "is_correct": None,
                    "confidence": "none",
                    "explanation": "Failed to extract content from any of the linked pages.",
                    "facts_found": [],
                    "inaccuracies": ["No content could be extracted from sources"],
                    "missing_context": "Unable to verify due to content extraction failures",
                    "sources": links_to_visit,
                    "token_usage": {
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "total_tokens": 0
                    }
                }
            
            # Verify the statement using the collected sources
            print(f"\n=== ANALYZING CONTENT FROM {len(sources)} SOURCES ===")
            
            # Show what content we're sending to the LLM
            for i, (url, content) in enumerate(sources, 1):
                print(f"\nSource {i}: {url}")
                print(f"Content length: {len(content)} characters")
                print("Content being analyzed:")
                print("=" * 60)
                print(content[:1000] + ("..." if len(content) > 1000 else ""))
                print("=" * 60)
            
            result = self.fact_check_with_llm(sources, statement)
            
            # Add the cumulative token usage to the result
            result["cumulative_token_usage"] = {
                "total_input_tokens": self.total_input_tokens,
                "total_output_tokens": self.total_output_tokens,
                "total_tokens": self.total_input_tokens + self.total_output_tokens
            }
            
            return result

async def main():
    api_key = "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"  
    fact_checker = FactCheckerSystem(api_key=api_key)
    statement = "trump is the president of the usa"
    result = await fact_checker.verify_statement(statement)
    
    print("\n--- Fact Check Results ---")
    print(json.dumps(result, indent=2))
    
    print("\n--- Total Token Usage ---")
    print(f"Total Input Tokens: {fact_checker.total_input_tokens}")
    print(f"Total Output Tokens: {fact_checker.total_output_tokens}")
    print(f"Total Tokens: {fact_checker.total_input_tokens + fact_checker.total_output_tokens}")
    
    return result

if __name__ == "__main__":
    asyncio.run(main())