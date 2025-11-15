
def normalize_product(raw):
	return {
	     "title": raw["title"]
	     "price": raw["price"]
	     "source": raw.get["source", "Alibaba"]
	}
