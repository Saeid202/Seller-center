from playwright.sync_api import sync_playwright

class AlibabaScraper:

	def run(self, query, max_result=5):
            with sync_playwright() as p:
		browser = p.chromium.launch(headless=True) #browser runs in the background, no UI shown
		page = browser.new_page()

		url = f"https://cargoplus.site/search?searchText={query}"
		page.goto(url)
		page.wait_for_timeout(3000)

		items = page.locator(".organic-gallery-offer-card").all() #finds & returns all HTML elements that represent individual product cards on the page.

		products = []
		for item in items[:max_results]:
		   try:

			title = item.locator[".element-title-normal_content").inner_text() #.locator().inner_text() to extract title and price.
		   except:
			title = ""

		   try:
			price = item.locator(".element-offer-price-normal_price").inner_text()
		   except:
			price = ""

		   products.append({
			"title": title.strip()
			"price": price.strip()
			"source": "Alibaba"

		   })

		   browser.close()
		   return products #returns a list of all product in the dictionary
