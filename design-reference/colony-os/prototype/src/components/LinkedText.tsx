export function messageLinks(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/g)]
    .map((match) => match[0].replace(/[.,!?)]*$/, ""))
    .filter((url) => {
      try {
        return ["http:", "https:"].includes(new URL(url).protocol);
      } catch {
        return false;
      }
    });
}

export function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return <>
    {parts.map((part, index) => {
      const url = part.replace(/[.,!?)]*$/, "");
      const suffix = part.slice(url.length);
      if (!/^https?:\/\//.test(url)) return part;
      return <span key={index}>
        <a className="inline-link" href={url} target="_blank" rel="noopener noreferrer">{url}</a>{suffix}
      </span>;
    })}
  </>;
}
