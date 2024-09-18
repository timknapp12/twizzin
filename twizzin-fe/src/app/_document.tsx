import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Google tag (gtag.js) */}
          <script
            async
            src='https://www.googletagmanager.com/gtag/js?id=G-1SM9WJYQXX'
          ></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-1SM9WJYQXX');
              `,
            }}
          />
          {/* End Google tag (gtag.js) */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
