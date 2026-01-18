# Typography Configuration

## Google Fonts Import

Add to your HTML `<head>` or CSS:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## Font Usage

- **Headings:** Inter (weights: 400, 500, 600, 700)
- **Body text:** Inter (weights: 400, 500, 600)
- **Code/technical:** JetBrains Mono (weights: 400, 500)

## CSS Variables

```css
font-family: var(--font-heading); /* For headings */
font-family: var(--font-body);     /* For body text */
font-family: var(--font-mono);    /* For code */
```


