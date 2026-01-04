import { useState } from "react";
import { Upload as AntUpload, Flex, Image } from "antd";
import { useEditorStore } from "../store/useEditorStore";

import { CiCirclePlus } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";

export default function Upload({ setPagesWithHistory }) {
  const { activeIndex, canvasSize, uploadsPhotos, setSelectedUniqueId, setPopUp, setUploadsPhotos } = useEditorStore();
  const [fileList, setFileList] = useState([]);

  const addImageToCanvas = ({ src, w = 300, h = 200 }) => {
    const id = `i${Date.now()}`;

    // Center with offset
    const x = (canvasSize?.w - 500) / 2;
    const y = (canvasSize?.h - 1000) / 2;

    setPagesWithHistory((prev) => {
      const cp = JSON?.parse(JSON?.stringify(prev));
      const page =
        cp[activeIndex] || {
          id: activeIndex + 1,
          children: [],
          background: "#ffffff",
        };
      page.children = page?.children || [];
      page?.children?.push({
        id,
        type: "image",
        src,
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        offsetX: w / 2,
        offsetY: h / 2,
      });
      cp[activeIndex] = page;
      return cp;
    });

    setTimeout(() => {
      setSelectedUniqueId(id);
      setPopUp(false);
    }, 10);
  };

  // Convert file to base64 data URL
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  // Handle multiple upload - convert to base64
  const handleUpload = async ({ fileList: newFileList }) => {
    const newUploads = await Promise.all(
      newFileList.map(async (file) => {
        if (!file?.url && !file?.preview) {
          // Convert to base64 instead of blob URL
          file.preview = await fileToBase64(file.originFileObj);
        }
        return {
          id: file?.uid,
          url: file?.preview,
          name: file?.name,
        };
      })
    );

    setUploadsPhotos(newUploads);
    setFileList(newFileList);
  };

  const handleDelete = (id) => {
    const newUploads = uploadsPhotos?.filter((u) => u?.id !== id);
    setUploadsPhotos(newUploads);

    const newFileList = fileList?.filter((f) => f?.uid !== id);
    setFileList(newFileList);
  };

  return (
    <>

      <AntUpload
        multiple
        listType="picture-card"
        fileList={fileList}
        showUploadList={false}
        beforeUpload={() => false}
        onChange={handleUpload}
        style={{ width: "100%" }}
      >
        <CiCirclePlus size={40} color="gray" />
      </AntUpload>

      <div style={{ height: "60vh", overflow: "auto" }}>
        {uploadsPhotos?.map((u) => (
          <Flex key={u?.id} align="center" justify="space-evenly" style={{ padding: 5 }} wrap>
            <Image preview={false} alt={u?.name} src={u?.url} width={150} height={100} style={{ objectFit: "contain", cursor: "pointer" }} onClick={() => addImageToCanvas({ src: u?.url, w: 400, h: 300 })} />
            <MdDeleteOutline key="delete" color="red" size={25} onClick={() => handleDelete(u?.id)} />
          </Flex>
        ))}
      </div>
    </>
  );
};