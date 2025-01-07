import { createFileRoute } from "@tanstack/react-router";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { api } from "../lib/api";
import { useQuery } from "@tanstack/react-query";


export const Route = createFileRoute("/")({
  component: Index,
});

async function getIdCount() {
  const res = await api.users["id-count"].get();
  if (!res.response.ok) {
    throw new Error("Server error");
  }
  const data = await res.data?.count;
  return data;
}

function Index() {
  const { isPending, error, data } = useQuery({
    queryKey: ["get-id-count"],
    queryFn: getIdCount,
  });

  if (isPending) return "Loading...";

  if (error) return "An error has occurred: " + error.message;
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel className="p-5">{data}</ResizablePanel>
      {/* <ResizablePanel className="p-5">one</ResizablePanel> */}
      <ResizableHandle withHandle />
      <ResizablePanel className="p-5">Two</ResizablePanel>
    </ResizablePanelGroup>
  );
}
